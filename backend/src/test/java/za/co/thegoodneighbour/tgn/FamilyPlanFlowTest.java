package za.co.thegoodneighbour.tgn;

import static org.junit.jupiter.api.Assertions.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import za.co.thegoodneighbour.tgn.payment.LoggingSmsGateway;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "tgn.bootstrap-admin-email=staff@tgn.test", "tgn.bootstrap-admin-password=correct-horse-battery", "tgn.seed-base-rate-bps=160"})
class FamilyPlanFlowTest {
    @LocalServerPort int port;
    @Autowired LoggingSmsGateway sms;
    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = JsonMapper.builder().build();
    private static int seq = 0;

    record Person(String token, String phone) {}

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
        String phone = "+2782888" + String.format("%04d", ++seq);
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
    /** An approved (not yet paid) plan covering the owner and their mother. */
    private JsonNode plan(Person owner, String s) throws Exception {
        JsonNode p = ok(call("POST", "/api/policies", owner.token, "{\"items\":[{\"itemId\":\"grocery-5000\",\"quantity\":1}],\"holderIdNumber\":\"" + TestData.HOLDER_ID + "\",\"debitDay\":25,\"members\":["
                + TestData.member("parent", "Grace Mokoena", 62, true, 7) + "]" + consent() + "}"), 201);
        ok(call("POST", "/api/admin/policies/" + p.get("id").asString() + "/status", s, "{\"status\":\"approved\"}"), 200);
        return ok(call("GET", "/api/policies/" + p.get("id").asString(), owner.token, null), 200);
    }
    private JsonNode invite(Person owner, String pid, String name, String phone, int percent, int expect) throws Exception {
        return ok(call("POST", "/api/policies/" + pid + "/contributors", owner.token, "{\"name\":\"" + name + "\",\"phone\":\"" + phone + "\",\"sharePercent\":" + percent + "}"), expect);
    }
    private boolean hasTitle(Person p, String title) throws Exception {
        for (JsonNode n : ok(call("GET", "/api/me/notifications", p.token, null), 200).get("items")) if (title.equals(n.get("title").asString())) return true;
        return false;
    }

    @Test void siblingsShareTheCostAndTheOwnerPaysTheRest() throws Exception {
        Person owner = person("Naledi Dlamini", true), sibling = person("Thabo Dlamini", true), stranger = person("Someone Else", true);
        String s = staff();
        JsonNode p = plan(owner, s); String pid = p.get("id").asString(); long total = p.get("monthlyTotalCents").asLong();
        invite(owner, pid, "Thabo", sibling.phone, 30, 201);

        JsonNode inv = ok(call("GET", "/api/me/invitations", sibling.token, null), 200);
        assertEquals(1, inv.get("items").size());
        assertEquals("Naledi Dlamini", inv.get("items").get(0).get("ownerName").asString());
        assertEquals(3000, inv.get("items").get(0).get("shareBps").asInt());
        assertTrue(hasTitle(sibling, "You're invited to share a family plan"));
        assertEquals(0, ok(call("GET", "/api/me/invitations", stranger.token, null), 200).get("items").size());      // not for them

        String cid = inv.get("items").get(0).get("id").asString();
        assertEquals(404, call("POST", "/api/me/invitations/" + cid + "/accept", stranger.token, null).statusCode());
        JsonNode shared = ok(call("POST", "/api/me/invitations/" + cid + "/accept", sibling.token, null), 200);
        assertEquals(3000, shared.get("myShareBps").asInt());
        assertEquals(Math.round(total * 0.30), shared.get("myShareCents").asLong());
        assertEquals(7000, shared.get("ownerShareBps").asInt());
        assertEquals(total - Math.round(total * 0.30), shared.get("ownerShareCents").asLong());     // the shares always add up

        JsonNode mine = ok(call("GET", "/api/policies/" + pid, owner.token, null), 200);
        assertEquals(7000, mine.get("ownerShareBps").asInt());
        assertEquals("active", mine.get("contributors").get(0).get("status").asString());
        assertTrue(hasTitle(owner, "Thabo Dlamini joined your plan"));

        // What a contributor may see: names, relationships and prices. Never ID numbers, and never anyone's phone number.
        String raw = call("GET", "/api/me/shared-policies", sibling.token, null).body();
        assertFalse(raw.contains("idNumber"), raw);
        assertFalse(raw.contains(owner.phone) || raw.contains(sibling.phone), "phone numbers leaked");
        assertTrue(raw.contains("Grace Mokoena"));
        assertEquals(0, ok(call("GET", "/api/me/shared-policies", stranger.token, null), 200).size());
    }

    @Test void anUnverifiedNumberCannotAcceptAndTheSharesCannotOverflow() throws Exception {
        Person owner = person("Owner One", true), friend = person("Friend Unverified", false);
        String s = staff();
        String pid = plan(owner, s).get("id").asString();
        invite(owner, pid, "Friend", friend.phone, 20, 201);
        JsonNode inv = ok(call("GET", "/api/me/invitations", friend.token, null), 200);
        assertTrue(inv.get("needsVerification").asBoolean());
        assertEquals(0, inv.get("items").size());                                                          // nothing shown until the number is verified

        // rules on the owner's side
        invite(owner, pid, "Friend again", friend.phone, 10, 422);                                       // already invited
        invite(owner, pid, "Me", owner.phone, 10, 422);                                                  // yourself
        invite(owner, pid, "Too big", "+27829990001", 4, 400);                                           // under 5%
        invite(owner, pid, "Too big", "+27829990002", 91, 400);                                          // over 90%
        invite(owner, pid, "B", "+27829990003", 40, 201);
        invite(owner, pid, "C", "+27829990004", 36, 422);                                                // 20 + 40 + 36 would leave the owner under 5%
        invite(owner, pid, "C", "+27829990004", 30, 201);                                                // 20 + 40 + 30 = 90 is allowed
        invite(owner, pid, "D", "+27829990005", 5, 201);                                                 // 95% shared leaves the owner exactly 5%, the minimum
        invite(owner, pid, "E", "+27829990006", 5, 422);                                                 // nothing left to give
        assertEquals(401, call("POST", "/api/policies/" + pid + "/contributors", null, "{}").statusCode());
    }

    @Test void partialPaymentsFromEachSiblingStartTheCoverTogether() throws Exception {
        Person owner = person("Plan Owner", true), sibling = person("Paying Sibling", true);
        String s = staff();
        JsonNode p = plan(owner, s); String pid = p.get("id").asString(); long total = p.get("monthlyTotalCents").asLong();
        invite(owner, pid, "Sibling", sibling.phone, 40, 201);
        String cid = ok(call("GET", "/api/me/invitations", sibling.token, null), 200).get("items").get(0).get("id").asString();
        ok(call("POST", "/api/me/invitations/" + cid + "/accept", sibling.token, null), 200);

        long siblingPart = Math.round(total * 0.40), ownerPart = total - siblingPart;
        String today = TestData.today().toString();
        // the sibling's share alone is not enough to start cover
        JsonNode after1 = ok(call("POST", "/api/admin/policies/" + pid + "/payments", s, "{\"amountCents\":" + siblingPart + ",\"paidOn\":\"" + today + "\",\"reference\":\"EFT-S\",\"contributorId\":\"" + cid + "\"}"), 201);
        assertEquals("approved", after1.get("policy").get("status").asString());
        assertTrue(hasTitle(owner, "Waiting for the rest of the payments"));
        assertTrue(hasTitle(owner, "Payment received"));
        // the owner pays their part and cover starts
        JsonNode after2 = ok(call("POST", "/api/admin/policies/" + pid + "/payments", s, "{\"amountCents\":" + ownerPart + ",\"paidOn\":\"" + today + "\",\"reference\":\"EFT-O\"}"), 201);
        assertEquals("active", after2.get("policy").get("status").asString());

        // the ledger says who paid what, and everyone on the plan is told
        JsonNode mine = ok(call("GET", "/api/policies/" + pid, owner.token, null), 200);
        assertEquals(ownerPart, mine.get("ownerPaidThisMonthCents").asLong());
        assertEquals(siblingPart, mine.get("contributors").get(0).get("paidThisMonthCents").asLong());
        boolean namedPayer = false;
        for (JsonNode pay : mine.get("payments")) if ("Paying Sibling".equals(pay.get("paidBy").asString()) || "Sibling".equals(pay.get("paidBy").asString())) namedPayer = true;
        assertTrue(namedPayer, mine.get("payments").toString());
        assertTrue(hasTitle(sibling, "Your cover is active"));
        assertTrue(hasTitle(sibling, "Payment received"));
        JsonNode theirs = ok(call("GET", "/api/me/shared-policies", sibling.token, null), 200).get(0);
        assertEquals(siblingPart, theirs.get("myPaidThisMonthCents").asLong());
        assertEquals("active", theirs.get("status").asString());
    }

    @Test void aPlanWithNoContributorsStillNeedsTheFullFirstPayment() throws Exception {
        Person owner = person("Solo Owner", true);
        String s = staff();
        JsonNode p = plan(owner, s);
        assertEquals(422, call("POST", "/api/admin/policies/" + p.get("id").asString() + "/payments", s,
                "{\"amountCents\":" + (p.get("monthlyTotalCents").asLong() - 1) + ",\"paidOn\":\"" + TestData.today() + "\",\"reference\":\"EFT-X\"}").statusCode());
        assertEquals(422, call("POST", "/api/admin/policies/" + p.get("id").asString() + "/payments", s,
                "{\"amountCents\":" + p.get("monthlyTotalCents").asLong() + ",\"paidOn\":\"" + TestData.today() + "\",\"reference\":\"EFT-Y\",\"contributorId\":\"not-a-real-id\"}").statusCode());
    }

    @Test void contributorsCanChangeTheirShareLeaveOrBeRemovedAndTheOwnerPaysTheRest() throws Exception {
        Person owner = person("Owner Two", true), a = person("Sibling A", true), b = person("Sibling B", true);
        String s = staff();
        String pid = plan(owner, s).get("id").asString();
        invite(owner, pid, "A", a.phone, 30, 201);
        invite(owner, pid, "B", b.phone, 30, 201);
        String ca = ok(call("GET", "/api/me/invitations", a.token, null), 200).get("items").get(0).get("id").asString();
        String cb = ok(call("GET", "/api/me/invitations", b.token, null), 200).get("items").get(0).get("id").asString();
        ok(call("POST", "/api/me/invitations/" + ca + "/accept", a.token, null), 200);
        assertEquals(204, call("POST", "/api/me/invitations/" + cb + "/decline", b.token, null).statusCode());
        assertEquals(404, call("POST", "/api/me/invitations/" + cb + "/accept", b.token, null).statusCode());      // declined, so it's gone
        assertTrue(hasTitle(owner, "An invitation was declined"));

        // A changes their own share, but can't take more than the plan has room for
        assertEquals(2000 + 0, ok(call("PUT", "/api/me/shared-policies/" + ca + "/share", a.token, "{\"sharePercent\":20}"), 200).get("myShareBps").asInt());
        assertEquals(400, call("PUT", "/api/me/shared-policies/" + ca + "/share", a.token, "{\"sharePercent\":95}").statusCode());
        assertEquals(404, call("PUT", "/api/me/shared-policies/" + ca + "/share", b.token, "{\"sharePercent\":20}").statusCode());   // not theirs
        assertEquals(8000, ok(call("GET", "/api/policies/" + pid, owner.token, null), 200).get("ownerShareBps").asInt());

        // A leaves: their share goes back to the owner
        assertEquals(204, call("POST", "/api/me/shared-policies/" + ca + "/leave", a.token, null).statusCode());
        assertEquals(10000, ok(call("GET", "/api/policies/" + pid, owner.token, null), 200).get("ownerShareBps").asInt());
        assertTrue(hasTitle(owner, "A left your plan"));
        assertEquals(0, ok(call("GET", "/api/me/shared-policies", a.token, null), 200).size());

        // the owner can remove someone, and only their own plan
        invite(owner, pid, "C", "+27829991111", 15, 201);
        JsonNode mine = ok(call("GET", "/api/policies/" + pid, owner.token, null), 200);
        String cc = mine.get("contributors").get(0).get("id").asString();
        assertEquals(404, call("DELETE", "/api/policies/" + pid + "/contributors/" + cc, a.token, null).statusCode());
        assertEquals(0, ok(call("DELETE", "/api/policies/" + pid + "/contributors/" + cc, owner.token, null), 200).get("contributors").size());
    }

    // ---------- an owner who only pays (siblings covering their parents) ----------

    private String applyBody(String holderId, boolean coverMe, String membersJson, String bundle) throws Exception {
        return "{\"items\":[{\"itemId\":\"" + bundle + "\",\"quantity\":1}],\"holderIdNumber\":\"" + holderId + "\",\"debitDay\":25,\"members\":[" + membersJson + "]"
                + (coverMe ? "" : ",\"coverMainMember\":false") + consent() + "}";
    }

    @Test void anOwnerWhoOnlyPaysIsNotPricedAndNeedsSomeoneElseCovered() throws Exception {
        String parent = "{\"relationship\":\"parent\",\"dateOfBirth\":\"" + TestData.dobAged(62) + "\"}";
        JsonNode none = ok(call("POST", "/api/cover/quote", null, "{\"items\":[{\"itemId\":\"grocery-5000\",\"quantity\":1}],\"members\":[],\"holderDateOfBirth\":\"" + TestData.dobAged(40) + "\",\"coverMainMember\":false}"), 200);
        assertFalse(none.get("valid").asBoolean());
        assertTrue(none.get("problems").toString().contains("Add at least one person to cover"));
        assertFalse(none.get("mainCovered").asBoolean());

        JsonNode withParent = ok(call("POST", "/api/cover/quote", null, "{\"items\":[{\"itemId\":\"grocery-5000\",\"quantity\":1}],\"members\":[" + parent + "],\"holderDateOfBirth\":\"" + TestData.dobAged(40) + "\",\"coverMainMember\":false}"), 200);
        assertTrue(withParent.get("valid").asBoolean(), withParent.toString());
        assertEquals(0, withParent.get("main").get("feeCents").asLong());
        assertEquals(withParent.get("members").get(0).get("feeCents").asLong(), withParent.get("totalMonthlyCents").asLong());   // only the parent is paid for

        JsonNode normal = ok(call("POST", "/api/cover/quote", null, "{\"items\":[{\"itemId\":\"grocery-5000\",\"quantity\":1}],\"members\":[" + parent + "],\"holderDateOfBirth\":\"" + TestData.dobAged(40) + "\"}"), 200);
        assertTrue(normal.get("mainCovered").asBoolean());                                   // leaving it out keeps today's behaviour
        assertTrue(normal.get("main").get("feeCents").asLong() > 0);
    }

    @Test void thePlanOwnerKeepsTheirOwnAgeOutOfItAndCannotBeClaimedFor() throws Exception {
        Person owner = person("Owner Seventy", true); String s = staff();
        String ownerId = TestData.saId(TestData.dobAged(70), 3);                     // 70 is over the main-member age limit
        String mother = TestData.member("parent", "Mother Mokoena", 90 - 20, true, 4);   // 70
        // covering themselves at 70 is refused (the main member limit), but only paying is allowed
        assertEquals(422, call("POST", "/api/policies", owner.token, applyBody(ownerId, true, "", "grocery-5000")).statusCode());
        String parentJson = TestData.member("parent", "Gogo Mokoena", 62, true, 5);
        JsonNode p = ok(call("POST", "/api/policies", owner.token, applyBody(ownerId, false, parentJson, "grocery-5000")), 201);
        String pid = p.get("id").asString();
        assertFalse(p.get("coversMainMember").asBoolean());
        assertEquals(0, p.get("mainFeeCents").asLong());
        assertEquals(p.get("members").get(0).get("feeCents").asLong(), p.get("monthlyTotalCents").asLong());

        ok(call("POST", "/api/admin/policies/" + pid + "/status", s, "{\"status\":\"approved\"}"), 200);
        ok(call("POST", "/api/admin/policies/" + pid + "/payments", s, "{\"amountCents\":" + p.get("monthlyTotalCents").asLong() + ",\"paidOn\":\"" + TestData.today() + "\",\"reference\":\"EFT-OWN\"}"), 201);
        String today = TestData.today().toString();
        String claim = "{\"policyId\":\"" + pid + "\",\"dateOfDeath\":\"" + today + "\",\"causeOfDeath\":\"accidental\",\"claimantName\":\"Owner\",\"claimantPhone\":\"+27821234567\","
                + "\"delivery\":{\"recipientName\":\"Sipho\",\"recipientPhone\":\"+27715550000\",\"addressLine\":\"12 Street\",\"suburb\":\"Seshego\",\"city\":\"Polokwane\",\"province\":\"Limpopo\",\"postalCode\":\"0742\"}";
        HttpResponse<String> forOwner = call("POST", "/api/claims", owner.token, claim + "}");
        assertEquals(422, forOwner.statusCode());
        assertTrue(forOwner.body().contains("isn't covered"), forOwner.body());
        String memberId = p.get("members").get(0).get("id").asString();
        ok(call("POST", "/api/claims", owner.token, claim.replace("\"policyId\"", "\"memberId\":\"" + memberId + "\",\"policyId\"") + "}"), 201);   // the parent can be claimed for

        // later changes keep the setting: the bundle can change and people can be added, and the owner still isn't priced
        JsonNode changed = ok(call("POST", "/api/policies/" + pid + "/bundle", owner.token, "{\"items\":[{\"itemId\":\"grocery-7500\",\"quantity\":1}]}"), 200);
        assertFalse(changed.get("coversMainMember").asBoolean());
        assertEquals(0, changed.get("mainFeeCents").asLong());
        JsonNode added = ok(call("POST", "/api/policies/" + pid + "/members", owner.token, TestData.member("parent", "Baba Mokoena", 66, true, 6)), 201);
        assertEquals(0, added.get("mainFeeCents").asLong());
        assertEquals(added.get("members").get(0).get("feeCents").asLong() + added.get("members").get(1).get("feeCents").asLong(), added.get("monthlyTotalCents").asLong());
    }

    @Test void aSiblingWhoSharesTheCostSeesWhoIsCoveredWithoutTheOwner() throws Exception {
        Person owner = person("Owner Payer", true), sibling = person("Sibling Payer", true); String s = staff();
        String parentJson = TestData.member("parent", "Gogo Dube", 62, true, 8);
        JsonNode p = ok(call("POST", "/api/policies", owner.token, applyBody(TestData.saId(TestData.dobAged(35), 9), false, parentJson, "grocery-5000")), 201);
        String pid = p.get("id").asString();
        invite(owner, pid, "Sibling", sibling.phone, 30, 201);
        JsonNode inv = ok(call("GET", "/api/me/invitations", sibling.token, null), 200).get("items").get(0);
        assertEquals(1, inv.get("peopleCovered").asInt());                                   // just the parent, not the owner
        ok(call("POST", "/api/me/invitations/" + inv.get("id").asString() + "/accept", sibling.token, null), 200);
        JsonNode shared = ok(call("GET", "/api/me/shared-policies", sibling.token, null), 200).get(0);
        assertEquals(1, shared.get("members").size());
        assertEquals("parent", shared.get("members").get(0).get("relationship").asString());
        assertTrue(shared.toString().contains("Gogo Dube"));
    }
}
