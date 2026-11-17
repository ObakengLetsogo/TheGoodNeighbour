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
import za.co.thegoodneighbour.tgn.payment.LoggingSmsGateway;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "tgn.bootstrap-admin-email=staff@tgn.test", "tgn.bootstrap-admin-password=correct-horse-battery"})
class CoverFlowTest {
    @LocalServerPort int port;
    @Autowired LoggingSmsGateway sms;
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

    /** Registers a customer and verifies their phone with the code the dev SMS gateway "sent". */
    private String customer() throws Exception {
        String phone = "+2782333" + String.format("%04d", ++phoneSeq);
        String token = ok(call("POST", "/api/auth/register", null, "{\"fullName\":\"Thandi Mokoena\",\"phone\":\"" + phone + "\",\"password\":\"password123\"}"), 201).get("token").asString();
        ok(call("POST", "/api/me/phone-verification/start", token, null), 202);
        String code = sms.lastMessageTo(phone).replaceAll("^.*is (\\d{6}).*$", "$1");
        ok(call("POST", "/api/me/phone-verification/confirm", token, "{\"code\":\"" + code + "\"}"), 200);
        return token;
    }

    private String consent() throws Exception {
        JsonNode docs = ok(call("GET", "/api/legal", null, null), 200);
        int terms = 0, privacy = 0;
        for (JsonNode d : docs) { if ("terms".equals(d.get("slug").asString())) terms = d.get("version").asInt(); if ("privacy".equals(d.get("slug").asString())) privacy = d.get("version").asInt(); }
        return ",\"acceptedTermsVersion\":" + terms + ",\"acceptedPrivacyVersion\":" + privacy;
    }

    private String staff() throws Exception {
        return ok(call("POST", "/api/admin/auth/login", null, "{\"email\":\"staff@tgn.test\",\"password\":\"correct-horse-battery\"}"), 200).get("token").asString();
    }

    private static final String BUNDLE = "[{\"itemId\":\"grocery-5000\",\"quantity\":1},{\"itemId\":\"sheep\",\"quantity\":1}]";   // R8 200 value, R5 300 cost
    private static final String SPOUSE = "{\"relationship\":\"spouse\",\"fullName\":\"Sipho Mokoena\",\"idNumber\":\"8506155000084\",\"dateOfBirth\":\"1985-06-15\"}";
    private static final String CHILD = "{\"relationship\":\"child\",\"fullName\":\"Lerato Mokoena\",\"dateOfBirth\":\"2015-03-10\"}";

    private String apply(String items, String members) throws Exception {
        return "{\"items\":" + items + ",\"holderIdNumber\":\"9001015000085\",\"debitDay\":25,\"members\":[" + members + "]" + consent() + "}";
    }

    private String today() { return LocalDate.now(java.time.ZoneId.of("Africa/Johannesburg")).toString(); }

    @Test void catalogueIsPublicAndNeverExposesCost() throws Exception {
        var res = call("GET", "/api/cover", null, null);
        JsonNode c = ok(res, 200);
        assertEquals(6, c.get("items").size());
        assertEquals(7, c.get("relationships").size());
        assertEquals(180, c.get("naturalWaitingDays").asInt());
        assertEquals(0, c.get("accidentalWaitingDays").asInt());
        assertFalse(res.body().contains("costCents"), "the company's cost must never reach customers");
        assertTrue(c.get("items").get(1).get("contents").size() > 8); // the R5 000 grocery list is shown
    }

    @Test void quotePricesTheBundleAndFamilyAndExplainsProblems() throws Exception {
        JsonNode q = ok(call("POST", "/api/cover/quote", null, "{\"items\":" + BUNDLE + ",\"members\":[{\"relationship\":\"spouse\"},{\"relationship\":\"child\",\"dateOfBirth\":\"2015-03-10\"}]}"), 200);
        assertTrue(q.get("valid").asBoolean());
        assertEquals(820_000, q.get("bundleValueCents").asLong());
        assertEquals(8_480, q.get("baseMonthlyCents").asLong());                   // R5 300 cost x 1.6%
        assertEquals(8_480 + 8_480 + 3_392, q.get("totalMonthlyCents").asLong());  // + spouse 100% + child 40%

        JsonNode two = ok(call("POST", "/api/cover/quote", null, "{\"items\":[{\"itemId\":\"grocery-2500\",\"quantity\":1},{\"itemId\":\"grocery-5000\",\"quantity\":1}]}"), 200);
        assertFalse(two.get("valid").asBoolean());
        JsonNode none = ok(call("POST", "/api/cover/quote", null, "{\"items\":[]}"), 200);
        assertFalse(none.get("valid").asBoolean());
        assertTrue(none.get("problems").get(0).asString().contains("at least"));
        assertFalse(ok(call("POST", "/api/cover/quote", null, "{\"items\":[{\"itemId\":\"sheep\",\"quantity\":9}]}"), 200).get("valid").asBoolean());
    }

    @Test void applicationsAreServerPricedAndNeverActiveCover() throws Exception {
        String t = customer();
        JsonNode p = ok(call("POST", "/api/policies", t, apply(BUNDLE, SPOUSE + "," + CHILD)), 201);
        assertEquals(20_352, p.get("monthlyTotalCents").asLong());
        assertEquals("pending_review", p.get("status").asString());
        assertEquals("not_set_up", p.get("mandateStatus").asString());
        assertEquals("*********0085", p.get("holder").get("idNumber").asString());
        assertEquals(2, p.get("bundle").get("lines").size());
        assertEquals("spouse", p.get("members").get(0).get("relationship").asString());
        assertEquals(0, p.get("payments").size());
        String id = p.get("id").asString();

        JsonNode more = ok(call("POST", "/api/policies/" + id + "/members", t,
                "{\"relationship\":\"parent\",\"fullName\":\"Joyce Mokoena\",\"idNumber\":\"7008205000082\",\"dateOfBirth\":\"1970-08-20\"}"), 201);
        assertEquals(20_352 + 12_720, more.get("monthlyTotalCents").asLong()); // parent 150%
        String joyce = more.get("members").get(2).get("id").asString();
        assertEquals(20_352, ok(call("DELETE", "/api/policies/" + id + "/members/" + joyce, t, null), 200).get("monthlyTotalCents").asLong());
    }

    @Test void membersNeedAnIdNumberFromSixteenAndMustFollowTheRelationshipRules() throws Exception {
        String t = customer();
        assertEquals(422, call("POST", "/api/policies", t, apply(BUNDLE, SPOUSE.replace(",\"idNumber\":\"8506155000084\"", ""))).statusCode()); // adult without ID
        assertEquals(422, call("POST", "/api/policies", t, apply(BUNDLE, SPOUSE.replace("1985-06-15", "1985-06-16"))).statusCode());              // dob != ID
        assertEquals(422, call("POST", "/api/policies", t, apply(BUNDLE, SPOUSE + "," + SPOUSE.replace("8506155000084", "0101015000082").replace("1985-06-15", "2001-01-01"))).statusCode()); // two spouses
        assertEquals(422, call("POST", "/api/policies", t, apply(BUNDLE, CHILD.replace("2015-03-10", "1990-03-10"))).statusCode());               // child too old
        assertEquals(422, call("POST", "/api/policies", t, apply(BUNDLE, CHILD.replace("\"child\"", "\"cousin\""))).statusCode());                // unknown relationship
        assertEquals(422, call("POST", "/api/policies", t, apply(BUNDLE, SPOUSE.replace("8506155000084", "9001015000085"))).statusCode());        // same ID as holder
        assertEquals(422, call("POST", "/api/policies", t, apply(BUNDLE, "").replace("9001015000085", "9001015000086")).statusCode());            // bad checksum
        assertEquals(422, call("POST", "/api/policies", t, apply(BUNDLE, "").replace("\"debitDay\":25", "\"debitDay\":3")).statusCode());
        ok(call("POST", "/api/policies", t, apply(BUNDLE, CHILD)), 201);                       // a child under 16 needs no ID
        assertEquals(409, call("POST", "/api/policies", t, apply(BUNDLE, "")).statusCode());   // one open cover per customer
    }

    @Test void policiesArePrivateToTheirOwner() throws Exception {
        String a = customer(), b = customer();
        String id = ok(call("POST", "/api/policies", a, apply(BUNDLE, "")), 201).get("id").asString();
        assertEquals(404, call("GET", "/api/policies/" + id, b, null).statusCode());
        assertEquals(401, call("GET", "/api/policies", null, null).statusCode());
    }

    @Test void coverStartsOnlyAfterApprovalAndAConfirmedPayment() throws Exception {
        String t = customer(), s = staff();
        String id = ok(call("POST", "/api/policies", t, apply(BUNDLE, SPOUSE)), 201).get("id").asString();
        String pay = "{\"amountCents\":16960,\"paidOn\":\"" + today() + "\",\"reference\":\"EFT-1\"}";

        assertEquals(422, call("POST", "/api/admin/policies/" + id + "/payments", s, pay).statusCode());                      // not approved
        assertEquals(422, call("POST", "/api/admin/policies/" + id + "/status", s, "{\"status\":\"active\"}").statusCode());  // can't force active
        assertEquals(422, call("POST", "/api/admin/policies/" + id + "/status", s, "{\"status\":\"declined\"}").statusCode()); // reason needed
        ok(call("POST", "/api/admin/policies/" + id + "/status", s, "{\"status\":\"approved\"}"), 200);
        assertEquals(422, call("POST", "/api/admin/policies/" + id + "/payments", s, pay.replace("16960", "1000")).statusCode());       // underpaid
        assertEquals(422, call("POST", "/api/admin/policies/" + id + "/payments", s, pay.replace(today(), "2099-01-01")).statusCode()); // future

        JsonNode active = ok(call("POST", "/api/admin/policies/" + id + "/payments", s, pay), 201).get("policy");
        assertEquals("active", active.get("status").asString());
        assertEquals(LocalDate.parse(today()).plusDays(180).toString(), active.get("waitingEndsOn").asString());
        assertEquals(active.get("waitingEndsOn").asString(), active.get("members").get(0).get("coverStartsOn").asString());
        assertEquals("9001015000085", active.get("holder").get("idNumber").asString()); // staff see the full ID
        assertTrue(ok(call("GET", "/api/admin/audit", s, null), 200).toString().contains("payment.recorded"));
    }

    private String activePolicy(String t, String s, String members) throws Exception {
        JsonNode p = ok(call("POST", "/api/policies", t, apply(BUNDLE, members)), 201);
        String id = p.get("id").asString();
        ok(call("POST", "/api/admin/policies/" + id + "/status", s, "{\"status\":\"approved\"}"), 200);
        ok(call("POST", "/api/admin/policies/" + id + "/payments", s, "{\"amountCents\":" + p.get("monthlyTotalCents").asLong() + ",\"paidOn\":\"" + today() + "\",\"reference\":\"EFT-A\"}"), 201);
        return id;
    }

    @Test void upgradesWaitAndDowngradesApplyImmediately() throws Exception {
        String t = customer(), s = staff();
        String id = activePolicy(t, s, SPOUSE);
        String bigger = "[{\"itemId\":\"grocery-10000\",\"quantity\":1},{\"itemId\":\"sheep\",\"quantity\":2},{\"itemId\":\"cattle\",\"quantity\":1}]";
        JsonNode up = ok(call("POST", "/api/policies/" + id + "/bundle", t, "{\"items\":" + bigger + "}"), 200);
        assertEquals(2, up.get("bundleHistory").size());
        assertEquals(2, up.get("bundle").get("version").asInt());
        assertEquals(LocalDate.parse(today()).plusDays(180).toString(), up.get("bundle").get("upgradeWaitingEndsOn").asString());
        assertTrue(up.get("monthlyTotalCents").asLong() > 16_960);
        assertEquals(up.get("baseMonthlyCents").asLong(), up.get("members").get(0).get("feeCents").asLong()); // spouse follows the bundle

        JsonNode down = ok(call("POST", "/api/policies/" + id + "/bundle", t, "{\"items\":[{\"itemId\":\"grocery-2500\",\"quantity\":1}]}"), 200);
        assertEquals(3, down.get("bundleHistory").size());
        assertTrue(down.get("bundle").get("upgradeWaitingEndsOn").isNull());
        assertEquals(422, call("POST", "/api/policies/" + id + "/bundle", t, "{\"items\":[{\"itemId\":\"sheep\",\"quantity\":0}]}").statusCode()); // below the minimum
    }

    private String claim(String id, String memberJson, String cause, String died) {
        return "{\"policyId\":\"" + id + "\"" + memberJson + ",\"dateOfDeath\":\"" + died + "\",\"causeOfDeath\":\"" + cause + "\",\"claimantName\":\"Thandi\",\"claimantPhone\":\"+27821234567\","
                + "\"delivery\":{\"recipientName\":\"Sipho\",\"recipientPhone\":\"+27715550000\",\"addressLine\":\"12 Street\",\"suburb\":\"Seshego\",\"city\":\"Polokwane\",\"province\":\"Limpopo\",\"postalCode\":\"0742\"}}";
    }

    @Test void claimsOweTheBundleInForceAndFlagWaitingPeriodsByCause() throws Exception {
        String t = customer(), s = staff();
        JsonNode created = ok(call("POST", "/api/policies", t, apply(BUNDLE, "")), 201);
        assertEquals(422, call("POST", "/api/claims", t, claim(created.get("id").asString(), "", "natural", today())).statusCode()); // not active yet
        String id = created.get("id").asString();
        ok(call("POST", "/api/admin/policies/" + id + "/status", s, "{\"status\":\"approved\"}"), 200);
        ok(call("POST", "/api/admin/policies/" + id + "/payments", s, "{\"amountCents\":8480,\"paidOn\":\"" + today() + "\",\"reference\":\"EFT-C\"}"), 201);
        ok(call("POST", "/api/policies/" + id + "/bundle", t, "{\"items\":[{\"itemId\":\"grocery-10000\",\"quantity\":1},{\"itemId\":\"cattle\",\"quantity\":1}]}"), 200); // upgrade

        JsonNode natural = ok(call("POST", "/api/claims", t, claim(id, "", "natural", today())), 201);
        assertTrue(natural.get("withinWaitingPeriod").asBoolean());
        assertEquals(1, natural.get("bundle").get("version").asInt());             // the upgrade hasn't earned cover yet
        assertEquals("Polokwane", natural.get("delivery").get("city").asString());

        JsonNode accident = ok(call("POST", "/api/claims", t, claim(id, "", "accidental", today())), 201);
        assertFalse(accident.get("withinWaitingPeriod").asBoolean());              // accidents have no waiting period
        assertEquals(2, accident.get("bundle").get("version").asInt());            // and the upgrade applies at once
        assertFalse(accident.get("overAgeLimit").asBoolean());

        String cid = natural.get("id").asString();
        assertEquals(422, call("POST", "/api/admin/claims/" + cid + "/status", s, "{\"status\":\"delivered\"}").statusCode());
        ok(call("POST", "/api/admin/claims/" + cid + "/status", s, "{\"status\":\"under_review\"}"), 200);
        assertEquals("under_review", ok(call("GET", "/api/claims", t, null), 200).get(1).get("status").asString());
    }

    @Test void herdCapacityStopsPromisesTheFarmCannotKeep() throws Exception {
        String s = staff();
        JsonNode cfg = ok(call("GET", "/api/admin/cover", s, null), 200);
        String original = cfg.toString();
        JsonNode sheep = ok(call("GET", "/api/admin/benefits", s, null), 200).get(4);
        assertEquals("sheep", sheep.get("id").asString());
        long promisedBefore = herdPromised(s, "sheep");
        try {
            String tight = original.replaceFirst("\"maxCommitmentMultiple\":\\d+", "\"maxCommitmentMultiple\":1");
            ok(call("PUT", "/api/admin/cover", s, tight), 200);
            // set the herd just big enough for what is already promised plus nothing more
            String upd = "{\"name\":\"Sheep\",\"description\":\"d\",\"valueCents\":320000,\"costCents\":150000,\"maxQty\":3,\"active\":true,\"onFarm\":" + (promisedBefore + 1) + ",\"contents\":[]}";
            ok(call("PUT", "/api/admin/benefits/sheep", s, upd), 200);
            JsonNode q = ok(call("POST", "/api/cover/quote", null, "{\"items\":[{\"itemId\":\"sheep\",\"quantity\":3}]}"), 200);
            assertFalse(q.get("valid").asBoolean());
            assertTrue(q.get("problems").toString().contains("temporarily unavailable"));
            assertFalse(ok(call("GET", "/api/cover", null, null), 200).get("items").get(4).get("available").isNull());
            JsonNode herd = ok(call("GET", "/api/admin/herd", s, null), 200);
            assertEquals(1, herd.get(0).get("remaining").asLong());
        } finally {
            ok(call("PUT", "/api/admin/cover", s, original), 200);
            ok(call("PUT", "/api/admin/benefits/sheep", s, "{\"name\":\"Sheep\",\"description\":\"d\",\"valueCents\":320000,\"costCents\":150000,\"maxQty\":3,\"active\":true,\"onFarm\":120,\"contents\":[]}"), 200);
        }
    }

    private long herdPromised(String s, String id) throws Exception {
        for (JsonNode h : ok(call("GET", "/api/admin/herd", s, null), 200)) if (id.equals(h.get("itemId").asString())) return h.get("promised").asLong();
        return 0;
    }

    @Test void customerAndStaffTokensAreNotInterchangeable() throws Exception {
        String t = customer(), s = staff();
        assertEquals(401, call("GET", "/api/admin/dashboard", t, null).statusCode());
        assertEquals(401, call("GET", "/api/admin/cover", t, null).statusCode());
        assertEquals(401, call("GET", "/api/policies", s, null).statusCode());
        assertEquals(200, call("GET", "/api/admin/dashboard", s, null).statusCode());
        assertEquals(401, call("POST", "/api/admin/auth/login", null, "{\"email\":\"staff@tgn.test\",\"password\":\"wrong-password-here\"}").statusCode());
    }

    @Test void debitOrderSetupAdmitsItIsNotConnected() throws Exception {
        String t = customer();
        String id = ok(call("POST", "/api/policies", t, apply(BUNDLE, "")), 201).get("id").asString();
        assertEquals("not_configured", ok(call("POST", "/api/policies/" + id + "/debit-order", t, null), 200).get("state").asString());
        assertEquals("not_set_up", ok(call("GET", "/api/policies/" + id, t, null), 200).get("mandateStatus").asString());
    }

    @Test void pricingRulesAreEditableByStaffAndAudited() throws Exception {
        String s = staff();
        JsonNode cfg = ok(call("GET", "/api/admin/cover", s, null), 200);
        String body = cfg.toString();
        try {
            assertEquals(200, call("PUT", "/api/admin/cover", s, body.replaceFirst("\"baseRateBps\":\\d+", "\"baseRateBps\":200")).statusCode());
            assertEquals(10_600, ok(call("POST", "/api/cover/quote", null, "{\"items\":" + BUNDLE + "}"), 200).get("baseMonthlyCents").asLong()); // R5 300 x 2%
            assertEquals(422, call("PUT", "/api/admin/cover", s, body.replace("\"spouse\"", "\"cousin\"")).statusCode());
            assertTrue(ok(call("GET", "/api/admin/audit", s, null), 200).toString().contains("cover.config.updated"));
        } finally {
            ok(call("PUT", "/api/admin/cover", s, body), 200);
        }
    }
}
