package za.co.thegoodneighbour.tgn;

import static org.junit.jupiter.api.Assertions.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "tgn.bootstrap-admin-email=staff@tgn.test", "tgn.bootstrap-admin-password=correct-horse-battery"})
class PlanFlowTest {
    @LocalServerPort int port;
    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = JsonMapper.builder().build();
    private static int phoneSeq = 0;

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
        String phone = "+2782333" + String.format("%04d", ++phoneSeq);
        return ok(call("POST", "/api/auth/register", null, "{\"fullName\":\"Thandi Mokoena\",\"phone\":\"" + phone + "\",\"password\":\"password123\"}"), 201).get("token").asString();
    }

    private String staff() throws Exception {
        return ok(call("POST", "/api/admin/auth/login", null, "{\"email\":\"staff@tgn.test\",\"password\":\"correct-horse-battery\"}"), 200).get("token").asString();
    }

    private static final String SPOUSE = "{\"type\":\"spouse\",\"fullName\":\"Sipho Mokoena\",\"idNumber\":\"8506155000084\",\"dateOfBirth\":\"1985-06-15\"}";
    private static final String CHILD = "{\"type\":\"child\",\"fullName\":\"Lerato Mokoena\",\"dateOfBirth\":\"2015-03-10\"}";

    private static String apply(String members) {
        return "{\"planId\":\"family\",\"holderIdNumber\":\"9001015000085\",\"debitDay\":25,\"members\":[" + members + "]}";
    }

    @Test void plansArePublic() throws Exception {
        JsonNode plans = ok(call("GET", "/api/plans", null, null), 200);
        assertEquals(3, plans.size());
        assertEquals(4, plans.get(2).get("memberRules").size()); // Complete plan: spouse, child, parent, extended
    }

    @Test void applicationsAreServerPricedAndNeverActiveCover() throws Exception {
        String t = customer();
        JsonNode p = ok(call("POST", "/api/policies", t, apply(SPOUSE + "," + CHILD)), 201);
        // family plan sample: R179 + spouse R90 + child R35 = R304
        assertEquals(30_400, p.get("monthlyTotalCents").asLong());
        assertEquals("pending_review", p.get("status").asString());
        assertEquals("not_set_up", p.get("mandateStatus").asString());
        assertEquals("*********0085", p.get("holder").get("idNumber").asString());
        assertEquals(0, p.get("payments").size());

        JsonNode withMember = ok(call("POST", "/api/policies/" + p.get("id").asString() + "/members", t,
                "{\"type\":\"child\",\"fullName\":\"Thabo Mokoena\",\"dateOfBirth\":\"2018-01-01\"}"), 201);
        assertEquals(30_400 + 3_500, withMember.get("monthlyTotalCents").asLong());
        String thabo = withMember.get("members").get(2).get("id").asString();
        JsonNode removed = ok(call("DELETE", "/api/policies/" + p.get("id").asString() + "/members/" + thabo, t, null), 200);
        assertEquals(30_400, removed.get("monthlyTotalCents").asLong());
        assertEquals(1, ok(call("GET", "/api/policies", t, null), 200).size());
    }

    @Test void validatesIdsAgesAndDuplicates() throws Exception {
        String t = customer();
        assertEquals(422, call("POST", "/api/policies", t, apply("").replace("9001015000085", "9001015000086")).statusCode()); // bad checksum
        assertEquals(422, call("POST", "/api/policies", t, apply(CHILD.replace("2015-03-10", "1990-03-10"))).statusCode());       // child too old
        assertEquals(422, call("POST", "/api/policies", t, apply(SPOUSE.replace("1985-06-15", "1985-06-16"))).statusCode());    // dob != id
        assertEquals(422, call("POST", "/api/policies", t, apply("").replace("\"debitDay\":25", "\"debitDay\":3")).statusCode());
        ok(call("POST", "/api/policies", t, apply("")), 201);
        assertEquals(409, call("POST", "/api/policies", t, apply("")).statusCode()); // one open plan per customer
    }

    @Test void policiesArePrivateToTheirOwner() throws Exception {
        String a = customer(), b = customer();
        String id = ok(call("POST", "/api/policies", a, apply("")), 201).get("id").asString();
        assertEquals(404, call("GET", "/api/policies/" + id, b, null).statusCode());
        assertEquals(401, call("GET", "/api/policies", null, null).statusCode());
    }

    @Test void coverStartsOnlyAfterApprovalAndAConfirmedPayment() throws Exception {
        String t = customer(), s = staff();
        String id = ok(call("POST", "/api/policies", t, apply(SPOUSE)), 201).get("id").asString();
        String pay = "{\"amountCents\":26900,\"paidOn\":\"2026-01-01\",\"reference\":\"EFT-1\"}";

        assertEquals(422, call("POST", "/api/admin/policies/" + id + "/payments", s, pay).statusCode());   // not approved yet
        assertEquals(422, call("POST", "/api/admin/policies/" + id + "/status", s, "{\"status\":\"active\"}").statusCode()); // can't force active
        assertEquals(422, call("POST", "/api/admin/policies/" + id + "/status", s, "{\"status\":\"declined\"}").statusCode()); // reason needed

        assertEquals("approved", ok(call("POST", "/api/admin/policies/" + id + "/status", s, "{\"status\":\"approved\"}"), 200).get("policy").get("status").asString());
        assertEquals(422, call("POST", "/api/admin/policies/" + id + "/payments", s, pay.replace("26900", "1000")).statusCode()); // underpaid
        assertEquals(422, call("POST", "/api/admin/policies/" + id + "/payments", s, pay.replace("2026-01-01", "2099-01-01")).statusCode());

        JsonNode active = ok(call("POST", "/api/admin/policies/" + id + "/payments", s, pay.replace("2026-01-01", java.time.LocalDate.now().toString())), 201);
        assertEquals("active", active.get("policy").get("status").asString());
        assertNotNull(active.get("policy").get("waitingEndsOn").asString());
        assertEquals(1, active.get("policy").get("payments").size());
        assertEquals("9001015000085", active.get("policy").get("holder").get("idNumber").asString()); // staff see full ID

        JsonNode audit = ok(call("GET", "/api/admin/audit", s, null), 200);
        assertTrue(audit.toString().contains("payment.recorded"));
    }

    @Test void claimsNeedActiveCoverAndAreFlaggedInsideTheWaitingPeriod() throws Exception {
        String t = customer(), s = staff();
        JsonNode p = ok(call("POST", "/api/policies", t, apply(SPOUSE)), 201);
        String id = p.get("id").asString();
        String claim = "{\"policyId\":\"" + id + "\",\"dateOfDeath\":\"" + java.time.LocalDate.now() + "\",\"claimantName\":\"Thandi\",\"claimantPhone\":\"+27821234567\"}";
        assertEquals(422, call("POST", "/api/claims", t, claim).statusCode()); // not active

        ok(call("POST", "/api/admin/policies/" + id + "/status", s, "{\"status\":\"approved\"}"), 200);
        ok(call("POST", "/api/admin/policies/" + id + "/payments", s, "{\"amountCents\":26900,\"paidOn\":\"" + java.time.LocalDate.now() + "\",\"reference\":\"EFT-2\"}"), 201);
        JsonNode c = ok(call("POST", "/api/claims", t, claim), 201);
        assertTrue(c.get("withinWaitingPeriod").asBoolean());

        String cid = c.get("id").asString();
        assertEquals(422, call("POST", "/api/admin/claims/" + cid + "/status", s, "{\"status\":\"paid\"}").statusCode()); // must follow the process
        ok(call("POST", "/api/admin/claims/" + cid + "/status", s, "{\"status\":\"under_review\"}"), 200);
        assertEquals("under_review", ok(call("GET", "/api/claims", t, null), 200).get(0).get("status").asString());
    }

    @Test void customerAndStaffTokensAreNotInterchangeable() throws Exception {
        String t = customer(), s = staff();
        assertEquals(401, call("GET", "/api/admin/dashboard", t, null).statusCode());
        assertEquals(401, call("GET", "/api/admin/dashboard", null, null).statusCode());
        assertEquals(401, call("GET", "/api/policies", s, null).statusCode());
        assertEquals(200, call("GET", "/api/admin/dashboard", s, null).statusCode());
        assertEquals(401, call("POST", "/api/admin/auth/login", null, "{\"email\":\"staff@tgn.test\",\"password\":\"wrong-password-here\"}").statusCode());
    }

    @Test void debitOrderSetupAdmitsItIsNotConnected() throws Exception {
        String t = customer();
        String id = ok(call("POST", "/api/policies", t, apply("")), 201).get("id").asString();
        JsonNode r = ok(call("POST", "/api/policies/" + id + "/debit-order", t, null), 200);
        assertEquals("not_configured", r.get("state").asString());
        assertEquals("not_set_up", ok(call("GET", "/api/policies/" + id, t, null), 200).get("mandateStatus").asString());
    }

    @Test void planPricingCanBeChangedByStaffAndIsAudited() throws Exception {
        String s = staff();
        JsonNode plan = ok(call("GET", "/api/admin/plans", s, null), 200).get(0);
        String id = plan.get("id").asString();
        String body = "{\"name\":\"Essential\",\"description\":\"d\",\"coverCents\":1500000,\"premiumCents\":10500,\"waitingPeriodDays\":6,\"minAge\":18,\"maxAge\":65,\"active\":true,"
                + "\"memberRules\":[{\"type\":\"spouse\",\"feeCents\":6000,\"coverCents\":1500000,\"maxCount\":1,\"minAge\":18,\"maxAge\":65}]}";
        assertEquals(10500, ok(call("PUT", "/api/admin/plans/" + id, s, body), 200).get("premiumCents").asLong());
        assertEquals(422, call("PUT", "/api/admin/plans/" + id, s, body.replace("\"spouse\"", "\"cousin\"")).statusCode());
        assertTrue(ok(call("GET", "/api/admin/audit", s, null), 200).toString().contains("plan.updated"));
    }
}
