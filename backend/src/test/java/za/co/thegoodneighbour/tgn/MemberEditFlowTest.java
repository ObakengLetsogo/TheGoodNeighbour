package za.co.thegoodneighbour.tgn;

import static org.junit.jupiter.api.Assertions.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import za.co.thegoodneighbour.tgn.payment.LoggingSmsGateway;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "tgn.bootstrap-admin-email=staff@tgn.test", "tgn.bootstrap-admin-password=correct-horse-battery", "tgn.seed-base-rate-bps=160"})
class MemberEditFlowTest {
    @LocalServerPort int port;
    @Autowired LoggingSmsGateway sms;
    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = JsonMapper.builder().build();
    private static int seq = 0;

    private HttpResponse<String> call(String method, String path, String token, String body) throws Exception {
        var b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).header("Content-Type", "application/json");
        if (token != null) b.header("Authorization", "Bearer " + token);
        b.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private JsonNode ok(HttpResponse<String> r, int status) throws Exception {
        assertEquals(status, r.statusCode(), r.body());
        return r.body().isBlank() ? null : json.readTree(r.body());
    }

    private String customer() throws Exception {
        String phone = "+2782666" + String.format("%04d", ++seq);
        String t = ok(call("POST", "/api/auth/register", null, "{\"fullName\":\"Thandi Mokoena\",\"phone\":\"" + phone + "\",\"password\":\"password123\"}"), 201).get("token").asString();
        ok(call("POST", "/api/me/phone-verification/start", t, null), 202);
        ok(call("POST", "/api/me/phone-verification/confirm", t, "{\"code\":\"" + sms.lastMessageTo(phone).replaceAll("^.*is (\\d{6}).*$", "$1") + "\"}"), 200);
        return t;
    }

    private String staff() throws Exception {
        return ok(call("POST", "/api/admin/auth/login", null, "{\"email\":\"staff@tgn.test\",\"password\":\"correct-horse-battery\"}"), 200).get("token").asString();
    }

    private String consent() throws Exception {
        int terms = 0, privacy = 0;
        for (JsonNode d : ok(call("GET", "/api/legal", null, null), 200)) { if ("terms".equals(d.get("slug").asString())) terms = d.get("version").asInt(); if ("privacy".equals(d.get("slug").asString())) privacy = d.get("version").asInt(); }
        return ",\"acceptedTermsVersion\":" + terms + ",\"acceptedPrivacyVersion\":" + privacy;
    }

    /** An application with a spouse (32) and a child (10, no ID yet). */
    private JsonNode apply(String t) throws Exception {
        String members = TestData.member("spouse", "Sipho Mokoena", 32, true, 21) + "," + TestData.member("child", "Lerato Mokoena", 10, false, 22);
        return ok(call("POST", "/api/policies", t, "{\"items\":[{\"itemId\":\"grocery-5000\",\"quantity\":1},{\"itemId\":\"sheep\",\"quantity\":1}],\"holderIdNumber\":\""
                + TestData.HOLDER_ID + "\",\"debitDay\":25,\"members\":[" + members + "]" + consent() + "}"), 201);
    }

    private String start(JsonNode p, String s) throws Exception {
        String id = p.get("id").asString();
        ok(call("POST", "/api/admin/policies/" + id + "/status", s, "{\"status\":\"approved\"}"), 200);
        ok(call("POST", "/api/admin/policies/" + id + "/payments", s, "{\"amountCents\":" + p.get("monthlyTotalCents").asLong() + ",\"paidOn\":\"" + TestData.today() + "\",\"reference\":\"EFT-M\"}"), 201);
        return id;
    }

    private static String memberId(JsonNode policy, String relationship) {
        for (JsonNode m : policy.get("members")) if (relationship.equals(m.get("relationship").asString())) return m.get("id").asString();
        throw new AssertionError("no " + relationship);
    }

    @Test void beforeCoverStartsEverythingCanBeCorrectedAndThePriceFollows() throws Exception {
        String t = customer();
        JsonNode p = apply(t);
        String id = p.get("id").asString(), child = memberId(p, "child");

        JsonNode renamed = ok(call("PUT", "/api/policies/" + id + "/members/" + child, t, "{\"fullName\":\"Lerato Nomsa Mokoena\"}"), 200);
        assertEquals("Lerato Nomsa Mokoena", renamed.get("members").get(1).get("fullName").asString());
        assertEquals(p.get("monthlyTotalCents").asLong(), renamed.get("monthlyTotalCents").asLong());   // a name doesn't change the price

        // the child turns out to be 34: change the date of birth, the relationship and add the ID together
        LocalDateHolder h = new LocalDateHolder(34, 23);
        assertEquals(422, call("PUT", "/api/policies/" + id + "/members/" + child, t, "{\"dateOfBirth\":\"" + h.dob + "\"}").statusCode());   // still a "child": too old
        JsonNode sibling = ok(call("PUT", "/api/policies/" + id + "/members/" + child, t,
                "{\"relationship\":\"sibling\",\"dateOfBirth\":\"" + h.dob + "\",\"idNumber\":\"" + h.id + "\"}"), 200);
        JsonNode m = sibling.get("members").get(1);
        assertEquals("sibling", m.get("relationship").asString());
        assertEquals(34, m.get("age").asInt());
        assertTrue(sibling.get("monthlyTotalCents").asLong() > p.get("monthlyTotalCents").asLong());      // an adult costs more than a child
        long sum = sibling.get("mainFeeCents").asLong();
        for (JsonNode x : sibling.get("members")) sum += x.get("feeCents").asLong();
        assertEquals(sum, sibling.get("monthlyTotalCents").asLong());                                       // the parts still add up

        // rules still apply
        String spouse = memberId(p, "spouse");
        assertEquals(422, call("PUT", "/api/policies/" + id + "/members/" + child, t, "{\"relationship\":\"spouse\"}").statusCode());         // only one spouse
        assertEquals(422, call("PUT", "/api/policies/" + id + "/members/" + child, t, "{\"idNumber\":\"" + TestData.HOLDER_ID + "\"}").statusCode()); // the holder's ID
        assertEquals(422, call("PUT", "/api/policies/" + id + "/members/" + spouse, t, "{\"dateOfBirth\":\"" + TestData.dobAged(33) + "\"}").statusCode()); // dob no longer matches the ID
    }

    @Test void afterCoverStartsACustomerCanFixANameAndAddAMissingIdButNotChangeWhoThePersonIs() throws Exception {
        String t = customer(), s = staff();
        JsonNode p = apply(t);
        String id = start(p, s), child = memberId(p, "child"), spouse = memberId(p, "spouse");

        ok(call("PUT", "/api/policies/" + id + "/members/" + spouse, t, "{\"fullName\":\"Sipho J Mokoena\"}"), 200);                              // spelling
        LocalDateHolder kid = new LocalDateHolder(10, 24);
        JsonNode withId = ok(call("PUT", "/api/policies/" + id + "/members/" + child, t,
                "{\"idNumber\":\"" + TestData.saId(TestData.dobAged(10), 22) + "\"}"), 200);                                                       // the child got an ID
        assertFalse(withId.get("members").get(1).get("idNumber").isNull());

        assertEquals(422, call("PUT", "/api/policies/" + id + "/members/" + spouse, t, "{\"idNumber\":\"" + kid.id + "\"}").statusCode());         // replacing an ID
        assertEquals(422, call("PUT", "/api/policies/" + id + "/members/" + spouse, t, "{\"dateOfBirth\":\"" + TestData.dobAged(40) + "\"}").statusCode());
        assertEquals(422, call("PUT", "/api/policies/" + id + "/members/" + spouse, t, "{\"relationship\":\"sibling\"}").statusCode());
        JsonNode after = ok(call("GET", "/api/policies/" + id, t, null), 200);
        assertEquals("spouse", after.get("members").get(0).get("relationship").asString());                                                      // nothing slipped through
    }

    @Test void staffCanChangeAnythingAndItIsAudited() throws Exception {
        String t = customer(), s = staff();
        JsonNode p = apply(t);
        String id = start(p, s), child = memberId(p, "child");
        LocalDateHolder h = new LocalDateHolder(12, 25);
        JsonNode r = ok(call("PUT", "/api/admin/policies/" + id + "/members/" + child, s,
                "{\"dateOfBirth\":\"" + h.dob + "\",\"idNumber\":\"" + h.id + "\"}"), 200).get("policy");
        assertEquals(12, r.get("members").get(1).get("age").asInt());
        assertTrue(ok(call("GET", "/api/admin/audit", s, null), 200).toString().contains("member.edited"));
        assertEquals(401, call("PUT", "/api/admin/policies/" + id + "/members/" + child, t, "{\"fullName\":\"Hacker\"}").statusCode());
    }

    @Test void onlyTheOwnerCanEditAMember() throws Exception {
        String a = customer(), b = customer();
        JsonNode p = apply(a);
        assertEquals(404, call("PUT", "/api/policies/" + p.get("id").asString() + "/members/" + memberId(p, "child"), b, "{\"fullName\":\"Someone Else\"}").statusCode());
    }

    private static final class LocalDateHolder {
        final LocalDate dobDate; final String dob; final String id;
        LocalDateHolder(int age, int seq) { dobDate = TestData.dobAged(age); dob = dobDate.toString(); id = TestData.saId(dobDate, seq); }
    }
}
