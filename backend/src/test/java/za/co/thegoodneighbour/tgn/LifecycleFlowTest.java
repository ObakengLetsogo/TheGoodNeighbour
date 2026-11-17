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
        "tgn.bootstrap-admin-email=staff@tgn.test", "tgn.bootstrap-admin-password=correct-horse-battery"})
class LifecycleFlowTest {
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
        String phone = "+2782555" + String.format("%04d", ++seq);
        String t = ok(call("POST", "/api/auth/register", null, "{\"fullName\":\"Thandi Mokoena\",\"phone\":\"" + phone + "\",\"password\":\"password123\"}"), 201).get("token").asString();
        ok(call("POST", "/api/me/phone-verification/start", t, null), 202);
        ok(call("POST", "/api/me/phone-verification/confirm", t, "{\"code\":\"" + sms.lastMessageTo(phone).replaceAll("^.*is (\\d{6}).*$", "$1") + "\"}"), 200);
        return t;
    }

    private String staff() throws Exception {
        return ok(call("POST", "/api/admin/auth/login", null, "{\"email\":\"staff@tgn.test\",\"password\":\"correct-horse-battery\"}"), 200).get("token").asString();
    }

    private String today() { return LocalDate.now(java.time.ZoneId.of("Africa/Johannesburg")).toString(); }

    private String consent() throws Exception {
        int terms = 0, privacy = 0;
        for (JsonNode d : ok(call("GET", "/api/legal", null, null), 200)) { if ("terms".equals(d.get("slug").asString())) terms = d.get("version").asInt(); if ("privacy".equals(d.get("slug").asString())) privacy = d.get("version").asInt(); }
        return ",\"acceptedTermsVersion\":" + terms + ",\"acceptedPrivacyVersion\":" + privacy;
    }

    private JsonNode apply(String t) throws Exception {
        return ok(call("POST", "/api/policies", t, "{\"items\":[{\"itemId\":\"grocery-5000\",\"quantity\":1},{\"itemId\":\"sheep\",\"quantity\":1}],\"holderIdNumber\":\"9001015000085\",\"debitDay\":25,\"members\":[]" + consent() + "}"), 201);
    }

    private String activePolicy(String t, String s) throws Exception {
        JsonNode p = apply(t);
        String id = p.get("id").asString();
        ok(call("POST", "/api/admin/policies/" + id + "/status", s, "{\"status\":\"approved\"}"), 200);
        ok(call("POST", "/api/admin/policies/" + id + "/payments", s, "{\"amountCents\":" + p.get("monthlyTotalCents").asLong() + ",\"paidOn\":\"" + today() + "\",\"reference\":\"EFT-L\"}"), 201);
        return id;
    }

    private JsonNode inboxItem(String s, String kind, String reference) throws Exception {
        JsonNode found = null;
        for (JsonNode i : ok(call("GET", "/api/admin/support", s, null), 200))
            if (kind.equals(i.get("kind").asString()) && !i.get("reference").isNull() && reference.equals(i.get("reference").asString())) found = i;
        return found;
    }

    @Test void withdrawingBeforeCoverStartsIsImmediateAndLetsThemApplyAgain() throws Exception {
        String t = customer();
        String id = apply(t).get("id").asString();
        JsonNode withdrawn = ok(call("POST", "/api/policies/" + id + "/cancel-request", t, "{\"reason\":\"Changed my mind\"}"), 200);
        assertEquals("cancelled", withdrawn.get("status").asString());
        assertEquals(today(), withdrawn.get("cancelledAt").asString());
        apply(t);   // an open cover blocks a second application, so this proves the first one is closed
    }

    @Test void cancellingStartedCoverIsARequestStaffConfirm() throws Exception {
        String t = customer(), s = staff();
        String id = activePolicy(t, s);
        JsonNode first = ok(call("POST", "/api/policies/" + id + "/cancel-request", t, "{\"reason\":\"Too expensive\",\"note\":\"Money is tight\"}"), 200);
        assertEquals("active", first.get("status").asString());              // not cancelled until staff confirm
        assertFalse(first.get("cancelRequestedAt").isNull());
        assertTrue(first.get("withinCoolingOff").asBoolean());               // just started: staff are warned
        String ref = first.get("reference").asString();
        JsonNode item = inboxItem(s, "cancellation_request", ref);
        assertNotNull(item);
        assertTrue(item.get("message").asString().contains("Too expensive"));
        ok(call("POST", "/api/policies/" + id + "/cancel-request", t, "{}"), 200);     // asking twice doesn't make two tickets
        int count = 0;
        for (JsonNode i : ok(call("GET", "/api/admin/support", s, null), 200)) if ("cancellation_request".equals(i.get("kind").asString()) && ref.equals(i.get("reference").asString())) count++;
        assertEquals(1, count);
        assertTrue(ok(call("GET", "/api/admin/dashboard", s, null), 200).get("cancellationRequests").asLong() >= 1);

        JsonNode kept = ok(call("DELETE", "/api/policies/" + id + "/cancel-request", t, null), 200);
        assertTrue(kept.get("cancelRequestedAt").isNull());
        assertEquals("resolved", inboxItem(s, "cancellation_request", ref).get("status").asString());

        ok(call("POST", "/api/policies/" + id + "/cancel-request", t, "{}"), 200);
        JsonNode cancelled = ok(call("POST", "/api/admin/policies/" + id + "/status", s, "{\"status\":\"cancelled\"}"), 200).get("policy");
        assertEquals("cancelled", cancelled.get("status").asString());
        assertTrue(cancelled.get("cancelRequestedAt").isNull());
        assertEquals(today(), cancelled.get("cancelledAt").asString());
    }

    @Test void lapsedCoverCanBeReinstatedKeepingItsWaitingPeriods() throws Exception {
        String t = customer(), s = staff();
        String id = activePolicy(t, s);
        JsonNode before = ok(call("GET", "/api/policies/" + id, t, null), 200);
        assertEquals(422, call("POST", "/api/policies/" + id + "/reinstate-request", t, "{}").statusCode());   // not lapsed
        String waitingEnds = before.get("waitingEndsOn").asString();

        JsonNode lapsed = ok(call("POST", "/api/admin/policies/" + id + "/status", s, "{\"status\":\"lapsed\"}"), 200).get("policy");
        assertEquals(today(), lapsed.get("lapsedAt").asString());
        assertEquals(LocalDate.parse(today()).plusDays(90).toString(), lapsed.get("reinstateUntil").asString());

        JsonNode asked = ok(call("POST", "/api/policies/" + id + "/reinstate-request", t, "{\"note\":\"Salary was late\"}"), 200);
        assertFalse(asked.get("reinstateRequestedAt").isNull());
        String ref = asked.get("reference").asString();
        assertNotNull(inboxItem(s, "reinstatement_request", ref));
        assertTrue(ok(call("GET", "/api/admin/dashboard", s, null), 200).get("reinstatementRequests").asLong() >= 1);

        long monthly = before.get("monthlyTotalCents").asLong();
        assertEquals(422, call("POST", "/api/admin/policies/" + id + "/payments", s, "{\"amountCents\":" + (monthly - 1) + ",\"paidOn\":\"" + today() + "\",\"reference\":\"EFT-SHORT\"}").statusCode());
        JsonNode back = ok(call("POST", "/api/admin/policies/" + id + "/payments", s, "{\"amountCents\":" + monthly + ",\"paidOn\":\"" + today() + "\",\"reference\":\"EFT-BACK\"}"), 201).get("policy");
        assertEquals("active", back.get("status").asString());
        assertEquals(waitingEnds, back.get("waitingEndsOn").asString());     // no new waiting period
        assertTrue(back.get("lapsedAt").isNull());
        assertTrue(back.get("reinstateRequestedAt").isNull());
        assertEquals("resolved", inboxItem(s, "reinstatement_request", ref).get("status").asString());
    }

    @Test void onlyTheOwnerCanCancelOrAskToReinstate() throws Exception {
        String a = customer(), b = customer(), s = staff();
        String id = activePolicy(a, s);
        assertEquals(404, call("POST", "/api/policies/" + id + "/cancel-request", b, "{}").statusCode());
        assertEquals(404, call("DELETE", "/api/policies/" + id + "/cancel-request", b, null).statusCode());
        assertEquals(404, call("POST", "/api/policies/" + id + "/reinstate-request", b, "{}").statusCode());
        assertEquals(401, call("POST", "/api/policies/" + id + "/cancel-request", null, "{}").statusCode());
    }
}
