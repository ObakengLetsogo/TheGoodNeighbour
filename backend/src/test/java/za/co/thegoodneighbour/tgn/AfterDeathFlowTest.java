package za.co.thegoodneighbour.tgn;

import static org.junit.jupiter.api.Assertions.*;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import za.co.thegoodneighbour.tgn.payment.LoggingSmsGateway;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "tgn.bootstrap-admin-email=staff@tgn.test", "tgn.bootstrap-admin-password=correct-horse-battery", "tgn.seed-base-rate-bps=160"})
class AfterDeathFlowTest {
    @LocalServerPort int port;
    @Autowired LoggingSmsGateway sms;
    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = JsonMapper.builder().build();
    private static int seq = 0;
    record Person(String token, String phone) {}

    @org.junit.jupiter.api.BeforeEach void noMinimumShare() throws Exception {      // the minimum share is global; these tests use small shares
        String s = staff();
        String cur = ok(call("GET", "/api/admin/cover", s, null), 200).toString();
        ok(call("PUT", "/api/admin/cover", s, cur.replaceFirst("\"minContributionCents\":\\d+", "\"minContributionCents\":0")), 200);
    }

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
    private Person person(String name, boolean verified) throws Exception {
        String phone = "+2782777" + String.format("%04d", ++seq + 5000);
        String t = ok(call("POST", "/api/auth/register", null, "{\"fullName\":\"" + name + "\",\"phone\":\"" + phone + "\",\"password\":\"password123\"}"), 201).get("token").asString();
        if (verified) {
            ok(call("POST", "/api/me/phone-verification/start", t, null), 202);
            ok(call("POST", "/api/me/phone-verification/confirm", t, "{\"code\":\"" + sms.lastMessageTo(phone).replaceAll("^.*is (\\d{6}).*$", "$1") + "\"}"), 200);
        }
        return new Person(t, phone);
    }
    private String staff() throws Exception {
        return ok(call("POST", "/api/admin/auth/login", null, "{\"email\":\"staff@tgn.test\",\"password\":\"correct-horse-battery\"}"), 200).get("token").asString();
    }
    private String consent() throws Exception {
        int terms = 0, privacy = 0;
        for (JsonNode d : ok(call("GET", "/api/legal", null, null), 200)) { if ("terms".equals(d.get("slug").asString())) terms = d.get("version").asInt(); if ("privacy".equals(d.get("slug").asString())) privacy = d.get("version").asInt(); }
        return ",\"acceptedTermsVersion\":" + terms + ",\"acceptedPrivacyVersion\":" + privacy;
    }
    private HttpResponse<String> upload(String token, String claimId, String type, byte[] content) throws Exception {
        String boundary = "----tgn" + System.nanoTime();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"type\"\r\n\r\n" + type + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"c.pdf\"\r\nContent-Type: application/octet-stream\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(content);
        out.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/claims/" + claimId + "/documents"))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary).header("Authorization", "Bearer " + token).POST(HttpRequest.BodyPublishers.ofByteArray(out.toByteArray())).build(), HttpResponse.BodyHandlers.ofString());
    }

    /** An active plan: the owner (covered unless coverMe is false) plus the given members, approved and paid in full. */
    private JsonNode activePlan(Person owner, String s, boolean coverMe, int ownerSeq, String... members) throws Exception {
        String holderId = TestData.saId(TestData.dobAged(40), ownerSeq);
        JsonNode p = ok(call("POST", "/api/policies", owner.token, "{\"items\":[{\"itemId\":\"grocery-5000\",\"quantity\":1}],\"holderIdNumber\":\"" + holderId + "\",\"debitDay\":25,\"members\":[" + String.join(",", members) + "]"
                + (coverMe ? "" : ",\"coverMainMember\":false") + consent() + "}"), 201);
        String pid = p.get("id").asString();
        ok(call("POST", "/api/admin/policies/" + pid + "/status", s, "{\"status\":\"approved\"}"), 200);
        ok(call("POST", "/api/admin/policies/" + pid + "/payments", s, "{\"amountCents\":" + p.get("monthlyTotalCents").asLong() + ",\"paidOn\":\"" + TestData.today() + "\",\"reference\":\"EFT-D\"}"), 201);
        return ok(call("GET", "/api/policies/" + pid, owner.token, null), 200);
    }
    private String claimBody(String pid, String memberId) {
        return "{\"policyId\":\"" + pid + "\"" + (memberId == null ? "" : ",\"memberId\":\"" + memberId + "\"") + ",\"dateOfDeath\":\"" + TestData.today() + "\",\"causeOfDeath\":\"accidental\",\"claimantName\":\"Family\",\"claimantPhone\":\"+27821234567\","
                + "\"delivery\":{\"recipientName\":\"Sipho\",\"recipientPhone\":\"+27715550000\",\"addressLine\":\"12 Street\",\"suburb\":\"Seshego\",\"city\":\"Polokwane\",\"province\":\"Limpopo\",\"postalCode\":\"0742\"}}";
    }
    /** Files a death claim and takes it through review to the given decision. */
    private String decide(Person owner, String s, String pid, String memberId, String decision, String extra) throws Exception {
        String cid = ok(call("POST", "/api/claims", owner.token, claimBody(pid, memberId)), 201).get("id").asString();
        ok(upload(owner.token, cid, "death_certificate", "%PDF-1.4\n% c\n".getBytes(StandardCharsets.UTF_8)), 201);
        ok(call("POST", "/api/admin/claims/" + cid + "/status", s, "{\"status\":\"under_review\"}"), 200);
        ok(call("POST", "/api/admin/claims/" + cid + "/status", s, "{\"status\":\"" + decision + "\"" + (decision.equals("declined") ? ",\"note\":\"Not payable.\"" : "") + extra + "}"), 200);
        return cid;
    }
    private boolean hasTitle(Person p, String title) throws Exception {
        for (JsonNode n : ok(call("GET", "/api/me/notifications", p.token, null), 200).get("items")) if (title.equals(n.get("title").asString())) return true;
        return false;
    }

    @Test void whenAMemberDiesTheirCoverAndPremiumEndAndTheFamilyIsTold() throws Exception {
        Person owner = person("Owner A", true); String s = staff();
        JsonNode plan = activePlan(owner, s, true, 1, TestData.member("parent", "Grace Mokoena", 62, true, 11));
        String pid = plan.get("id").asString(), memberId = plan.get("members").get(0).get("id").asString();
        long before = plan.get("monthlyTotalCents").asLong(), parentFee = plan.get("members").get(0).get("feeCents").asLong();

        decide(owner, s, pid, memberId, "approved", "");
        JsonNode after = ok(call("GET", "/api/policies/" + pid, owner.token, null), 200);
        assertEquals(0, after.get("members").size());                                            // no longer on the plan
        assertEquals(before - parentFee, after.get("monthlyTotalCents").asLong());              // and no longer charged for
        assertEquals("Grace Mokoena", after.get("inMemory").get(0).get("name").asString());
        assertEquals("active", after.get("status").asString());                                 // the rest of the plan carries on
        assertTrue(hasTitle(owner, "Cover for Grace Mokoena has ended"));
        // the same person can't be claimed for again
        assertEquals(422, call("POST", "/api/claims", owner.token, claimBody(pid, memberId)).statusCode());
    }

    @Test void aDeclinedDeathClaimStillEndsTheirCoverUnlessItWasMadeInError() throws Exception {
        Person owner = person("Owner B", true); String s = staff();
        JsonNode plan = activePlan(owner, s, true, 2, TestData.member("parent", "Gogo One", 62, true, 12), TestData.member("parent", "Gogo Two", 64, true, 13));
        String pid = plan.get("id").asString(), one = plan.get("members").get(0).get("id").asString(), two = plan.get("members").get(1).get("id").asString();
        decide(owner, s, pid, one, "declined", "");                                              // died, but not payable: premium still stops
        decide(owner, s, pid, two, "declined", ",\"madeInError\":true");                         // a mistake: nobody died
        JsonNode after = ok(call("GET", "/api/policies/" + pid, owner.token, null), 200);
        assertEquals(1, after.get("members").size());
        assertEquals("Gogo Two", after.get("members").get(0).get("fullName").asString());
        assertEquals("Gogo One", after.get("inMemory").get(0).get("name").asString());
    }

    @Test void whenTheMainMemberDiesTheFamilyKeepsCoverWhileSomeoneTakesOver() throws Exception {
        Person owner = person("Owner C", true), spouse = person("Sipho Successor", true); String s = staff();
        JsonNode plan = activePlan(owner, s, true, 3, TestData.member("spouse", "Sipho Successor", 38, true, 14), TestData.member("parent", "Gogo Three", 62, true, 15));
        String pid = plan.get("id").asString(), spouseId = plan.get("members").get(0).get("id").asString();
        long spouseFee = plan.get("members").get(0).get("feeCents").asLong(), parentFee = plan.get("members").get(1).get("feeCents").asLong();

        decide(owner, s, pid, null, "approved", "");                                             // the main member's own claim
        JsonNode after = ok(call("GET", "/api/policies/" + pid, owner.token, null), 200);
        assertEquals("active", after.get("status").asString());
        assertFalse(after.get("coversMainMember").asBoolean());
        assertEquals(0, after.get("mainFeeCents").asLong());
        assertEquals(spouseFee + parentFee, after.get("monthlyTotalCents").asLong());          // only the living are charged for
        assertEquals(TestData.today().plusDays(60).toString(), after.get("continuationUntil").asString());
        assertTrue(hasTitle(owner, "Cover continues for the rest of the family"));
        assertTrue(ok(call("GET", "/api/admin/support", s, null), 200).toString().contains("continuation_request"));   // staff are asked to arrange a successor
        boolean listed = false;
        for (JsonNode r : ok(call("GET", "/api/admin/collections", s, null), 200).get("rows")) if (pid.equals(r.get("policyId").asString())) listed = !r.get("continuationUntil").isNull();
        assertTrue(listed, "plans waiting for a successor should show in collections");

        // hand it to the spouse, who becomes the main member and is priced as one
        assertEquals(422, call("POST", "/api/admin/policies/" + pid + "/successor", s, "{\"memberId\":\"" + spouseId + "\"}").statusCode());                                   // no phone
        assertEquals(422, call("POST", "/api/admin/policies/" + pid + "/successor", s, "{\"memberId\":\"" + spouseId + "\",\"phone\":\"+27829990000\"}").statusCode());       // no such account
        assertEquals(422, call("POST", "/api/admin/policies/" + pid + "/successor", s, "{\"phone\":\"" + spouse.phone + "\"}").statusCode());                                  // nobody chosen
        JsonNode handed = ok(call("POST", "/api/admin/policies/" + pid + "/successor", s, "{\"memberId\":\"" + spouseId + "\",\"phone\":\"" + spouse.phone + "\"}"), 200).get("policy");
        assertEquals("Sipho Successor", handed.get("holder").get("name").asString());
        assertTrue(handed.get("coversMainMember").asBoolean());
        assertTrue(handed.get("mainFeeCents").asLong() > 0);
        assertTrue(handed.get("continuationUntil").isNull());
        assertEquals(1, handed.get("members").size());                                          // only the parent now
        assertEquals(1, ok(call("GET", "/api/policies", spouse.token, null), 200).size());     // it is now on the spouse's account
        assertEquals(404, call("GET", "/api/policies/" + pid, owner.token, null).statusCode());
        assertTrue(hasTitle(spouse, "You now own a family plan"));
    }

    @Test void thePlanClosesWhenNobodyIsLeftCovered() throws Exception {
        Person owner = person("Owner D", true); String s = staff();
        JsonNode plan = activePlan(owner, s, true, 4);
        String pid = plan.get("id").asString();
        decide(owner, s, pid, null, "approved", "");
        JsonNode after = ok(call("GET", "/api/policies/" + pid, owner.token, null), 200);
        assertEquals("cancelled", after.get("status").asString());
        assertTrue(hasTitle(owner, "Your plan has closed"));
    }

    @Test void aSiblingWhoPaysCanTakeOverAPlanWhoseOwnerWasNeverCovered() throws Exception {
        Person owner = person("Owner E", true), sibling = person("Sibling Successor", true); String s = staff();
        JsonNode plan = activePlan(owner, s, false, 5, TestData.member("parent", "Gogo Five", 62, true, 16));
        String pid = plan.get("id").asString();
        ok(call("POST", "/api/policies/" + pid + "/contributors", owner.token, "{\"name\":\"Sibling\",\"phone\":\"" + sibling.phone + "\",\"sharePercent\":30}"), 201);
        String cid = ok(call("GET", "/api/me/invitations", sibling.token, null), 200).get("items").get(0).get("id").asString();
        ok(call("POST", "/api/me/invitations/" + cid + "/accept", sibling.token, null), 200);
        String contributorId = ok(call("GET", "/api/policies/" + pid, owner.token, null), 200).get("contributors").get(0).get("id").asString();

        assertEquals(422, call("POST", "/api/admin/policies/" + pid + "/successor", s, "{\"contributorId\":\"" + contributorId + "\",\"idNumber\":\"" + TestData.saId(TestData.dobAged(34), 6) + "\"}").statusCode());   // owner not recorded as dead
        JsonNode handed = ok(call("POST", "/api/admin/policies/" + pid + "/successor", s, "{\"contributorId\":\"" + contributorId + "\",\"idNumber\":\"" + TestData.saId(TestData.dobAged(34), 6) + "\",\"ownerDiedOn\":\"" + TestData.today() + "\"}"), 200).get("policy");
        assertFalse(handed.get("coversMainMember").asBoolean());                                 // the new owner pays but isn't covered
        assertEquals(0, handed.get("contributors").size());                                       // and is no longer a contributor
        assertEquals(10000, handed.get("ownerShareBps").asInt());
        assertEquals("Sibling Successor", handed.get("holder").get("name").asString());
        assertEquals(1, ok(call("GET", "/api/policies", sibling.token, null), 200).size());
        assertEquals(0, ok(call("GET", "/api/me/shared-policies", sibling.token, null), 200).size());
        assertEquals(404, call("GET", "/api/policies/" + pid, owner.token, null).statusCode());
    }
}
