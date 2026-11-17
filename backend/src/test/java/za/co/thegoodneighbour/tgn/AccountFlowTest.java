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
        "tgn.bootstrap-admin-email=staff@tgn.test", "tgn.bootstrap-admin-password=correct-horse-battery"})
class AccountFlowTest {
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

    private String newPhone() { return "+2782444" + String.format("%04d", ++seq); }
    private String code(String phone) { return sms.lastMessageTo(phone).replaceAll("^.*is (\\d{6}).*$", "$1"); }

    private String register(String phone) throws Exception {
        return ok(call("POST", "/api/auth/register", null, "{\"fullName\":\"Thandi Mokoena\",\"phone\":\"" + phone + "\",\"password\":\"password123\"}"), 201).get("token").asString();
    }

    private String staff() throws Exception {
        return ok(call("POST", "/api/admin/auth/login", null, "{\"email\":\"staff@tgn.test\",\"password\":\"correct-horse-battery\"}"), 200).get("token").asString();
    }

    @Test void forgottenPasswordIsResetWithAnSmsCode() throws Exception {
        String phone = newPhone();
        String old = register(phone);
        ok(call("POST", "/api/auth/password-reset/request", null, "{\"phone\":\"" + phone + "\"}"), 202);
        String c = code(phone);
        assertEquals(422, call("POST", "/api/auth/password-reset/confirm", null, "{\"phone\":\"" + phone + "\",\"code\":\"000000\",\"newPassword\":\"brand-new-pass\"}").statusCode()); // wrong code
        assertEquals(400, call("POST", "/api/auth/password-reset/confirm", null, "{\"phone\":\"" + phone + "\",\"code\":\"" + c + "\",\"newPassword\":\"short\"}").statusCode());    // weak password
        ok(call("POST", "/api/auth/password-reset/confirm", null, "{\"phone\":\"" + phone + "\",\"code\":\"" + c + "\",\"newPassword\":\"brand-new-pass\"}"), 200);
        assertEquals(422, call("POST", "/api/auth/password-reset/confirm", null, "{\"phone\":\"" + phone + "\",\"code\":\"" + c + "\",\"newPassword\":\"another-pass-1\"}").statusCode()); // a code works once
        assertEquals(401, call("GET", "/api/me", old, null).statusCode());                                          // old sessions are signed out
        assertEquals(401, call("POST", "/api/auth/login", null, "{\"phone\":\"" + phone + "\",\"password\":\"password123\"}").statusCode());
        ok(call("POST", "/api/auth/login", null, "{\"phone\":\"" + phone + "\",\"password\":\"brand-new-pass\"}"), 200);
    }

    @Test void resetRequestsDoNotRevealWhichNumbersHaveAccounts() throws Exception {
        JsonNode known = ok(call("POST", "/api/auth/password-reset/request", null, "{\"phone\":\"" + register2() + "\"}"), 202);
        JsonNode unknown = ok(call("POST", "/api/auth/password-reset/request", null, "{\"phone\":\"" + newPhone() + "\"}"), 202);
        assertEquals(known.toString(), unknown.toString());
    }

    private String register2() throws Exception { String p = newPhone(); register(p); return p; }

    @Test void codesAreRateLimitedAndLockAfterFiveWrongAttempts() throws Exception {
        String phone = newPhone();
        String t = register(phone);
        for (int i = 0; i < 3; i++) ok(call("POST", "/api/me/phone-verification/start", t, null), 202);
        assertEquals(429, call("POST", "/api/me/phone-verification/start", t, null).statusCode());   // 3 an hour
        String real = code(phone);
        for (int i = 0; i < 5; i++) assertEquals(422, call("POST", "/api/me/phone-verification/confirm", t, "{\"code\":\"" + (real.equals("111111") ? "222222" : "111111") + "\"}").statusCode());
        assertEquals(422, call("POST", "/api/me/phone-verification/confirm", t, "{\"code\":\"" + real + "\"}").statusCode()); // even the right code, after 5 misses
    }

    @Test void fiveWrongPasswordsLockTheAccountForAWhile() throws Exception {
        String phone = newPhone();
        register(phone);
        for (int i = 0; i < 5; i++) assertEquals(401, call("POST", "/api/auth/login", null, "{\"phone\":\"" + phone + "\",\"password\":\"wrong-password\"}").statusCode());
        assertEquals(429, call("POST", "/api/auth/login", null, "{\"phone\":\"" + phone + "\",\"password\":\"password123\"}").statusCode()); // locked, even with the right password
    }

    @Test void changingPasswordSignsOutOtherDevicesAndReturnsANewSession() throws Exception {
        String phone = newPhone();
        String a = register(phone);
        String b = ok(call("POST", "/api/auth/login", null, "{\"phone\":\"" + phone + "\",\"password\":\"password123\"}"), 200).get("token").asString();
        assertEquals(422, call("POST", "/api/me/password", a, "{\"currentPassword\":\"nope-nope-no\",\"newPassword\":\"brand-new-pass\"}").statusCode());
        String fresh = ok(call("POST", "/api/me/password", a, "{\"currentPassword\":\"password123\",\"newPassword\":\"brand-new-pass\"}"), 200).get("token").asString();
        assertEquals(401, call("GET", "/api/me", a, null).statusCode());
        assertEquals(401, call("GET", "/api/me", b, null).statusCode());
        assertEquals(200, call("GET", "/api/me", fresh, null).statusCode());
        ok(call("POST", "/api/me/sign-out-all", fresh, null), 200);
        assertEquals(401, call("GET", "/api/me", fresh, null).statusCode());
    }

    @Test void phoneNumberChangeNeedsACodeSentToTheNewNumber() throws Exception {
        String phone = newPhone(), next = newPhone(), taken = register2();
        String t = register(phone);
        assertEquals(409, call("POST", "/api/me/phone/start", t, "{\"phone\":\"" + taken + "\"}").statusCode());
        assertEquals(422, call("POST", "/api/me/phone/start", t, "{\"phone\":\"" + phone + "\"}").statusCode());
        ok(call("POST", "/api/me/phone/start", t, "{\"phone\":\"" + next + "\"}"), 202);
        assertEquals(422, call("POST", "/api/me/phone/confirm", t, "{\"newPhone\":\"" + next + "\",\"code\":\"000000\"}").statusCode());
        JsonNode me = ok(call("POST", "/api/me/phone/confirm", t, "{\"newPhone\":\"" + next + "\",\"code\":\"" + code(next) + "\"}"), 200);
        assertEquals(next, me.get("user").get("phone").asString());
        assertTrue(me.get("user").get("phoneVerified").asBoolean());
        ok(call("POST", "/api/auth/login", null, "{\"phone\":\"" + next + "\",\"password\":\"password123\"}"), 200);
    }

    @Test void notificationPreferencesAreSaved() throws Exception {
        String t = register(newPhone());
        JsonNode before = ok(call("GET", "/api/me", t, null), 200).get("user");
        assertTrue(before.get("notifyClaims").asBoolean());
        assertFalse(before.get("notifyNews").asBoolean());
        JsonNode after = ok(call("PUT", "/api/me/notifications", t, "{\"claims\":false,\"payments\":true,\"news\":true}"), 200);
        assertFalse(after.get("notifyClaims").asBoolean());
        assertTrue(after.get("notifyNews").asBoolean());
        assertTrue(ok(call("GET", "/api/me", t, null), 200).get("smsEnabled").asBoolean());
    }

    private static final String APPLY = "{\"items\":[{\"itemId\":\"grocery-5000\",\"quantity\":1}],\"holderIdNumber\":\"" + TestData.HOLDER_ID + "\",\"debitDay\":25,\"members\":[]%s}";

    private String consent() throws Exception {
        int terms = 0, privacy = 0;
        for (JsonNode d : ok(call("GET", "/api/legal", null, null), 200)) { if ("terms".equals(d.get("slug").asString())) terms = d.get("version").asInt(); if ("privacy".equals(d.get("slug").asString())) privacy = d.get("version").asInt(); }
        return ",\"acceptedTermsVersion\":" + terms + ",\"acceptedPrivacyVersion\":" + privacy;
    }

    @Test void applyingNeedsAVerifiedPhoneAndRecordedConsent() throws Exception {
        String phone = newPhone();
        String t = register(phone);
        assertEquals(422, call("POST", "/api/policies", t, String.format(APPLY, consent())).statusCode());             // phone not verified
        ok(call("POST", "/api/me/phone-verification/start", t, null), 202);
        ok(call("POST", "/api/me/phone-verification/confirm", t, "{\"code\":\"" + code(phone) + "\"}"), 200);
        assertEquals(400, call("POST", "/api/policies", t, String.format(APPLY, "")).statusCode());                  // consent missing
        assertEquals(422, call("POST", "/api/policies", t, String.format(APPLY, ",\"acceptedTermsVersion\":99,\"acceptedPrivacyVersion\":99")).statusCode()); // stale versions
        ok(call("POST", "/api/policies", t, String.format(APPLY, consent())), 201);
    }

    @Test void legalTextIsPublicDraftsAreFlaggedAndEditsBumpTheVersionAndAreAudited() throws Exception {
        JsonNode terms = ok(call("GET", "/api/legal/terms", null, null), 200);
        assertTrue(terms.get("draft").asBoolean());
        assertTrue(terms.get("body").asString().contains("placeholder"));
        String s = staff();
        int v = terms.get("version").asInt();
        String body = terms.get("body").asString().replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
        assertEquals(v, ok(call("PUT", "/api/admin/legal/terms", s, "{\"title\":\"Terms Of Use\",\"body\":\"" + body + "\",\"draft\":true}"), 200).get("version").asInt()); // unchanged text
        assertEquals(v + 1, ok(call("PUT", "/api/admin/legal/terms", s, "{\"title\":\"Terms Of Use\",\"body\":\"" + body + " Updated.\",\"draft\":false}"), 200).get("version").asInt());
        assertFalse(ok(call("GET", "/api/legal/terms", null, null), 200).get("draft").asBoolean());
        assertEquals(401, call("PUT", "/api/admin/legal/terms", register(newPhone()), "{\"title\":\"x\",\"body\":\"y\",\"draft\":false}").statusCode());
        assertTrue(ok(call("GET", "/api/admin/audit", s, null), 200).toString().contains("legal.updated"));
    }

    @Test void deletingAnAccountIsImmediateWithoutRecordsAndAReviewRequestWithThem() throws Exception {
        String phone = newPhone();
        String t = register(phone);
        assertEquals(422, call("POST", "/api/me/delete", t, "{\"password\":\"wrong-password\"}").statusCode());
        assertEquals("deleted", ok(call("POST", "/api/me/delete", t, "{\"password\":\"password123\"}"), 200).get("state").asString());
        assertEquals(401, call("GET", "/api/me", t, null).statusCode());
        assertEquals(401, call("POST", "/api/auth/login", null, "{\"phone\":\"" + phone + "\",\"password\":\"password123\"}").statusCode());

        String phone2 = newPhone();
        String t2 = register(phone2);
        ok(call("POST", "/api/me/phone-verification/start", t2, null), 202);
        ok(call("POST", "/api/me/phone-verification/confirm", t2, "{\"code\":\"" + code(phone2) + "\"}"), 200);
        ok(call("POST", "/api/policies", t2, String.format(APPLY, consent())), 201);
        assertEquals("requested", ok(call("POST", "/api/me/delete", t2, "{\"password\":\"password123\"}"), 200).get("state").asString());
        assertEquals(200, call("GET", "/api/me", t2, null).statusCode());   // kept: there are records to review first
        String s = staff();
        JsonNode inbox = ok(call("GET", "/api/admin/support", s, null), 200);
        JsonNode req = null;
        for (JsonNode i : inbox) if ("deletion_request".equals(i.get("kind").asString()) && phone2.equals(i.get("customer").get("phone").asString())) req = i;
        assertNotNull(req);
        assertEquals("resolved", ok(call("POST", "/api/admin/support/" + req.get("id").asString() + "/status", s, "{\"status\":\"resolved\",\"note\":\"Handled by phone\"}"), 200).get("status").asString());
    }

    @Test void staffSeeSupportRequestsAndTheCustomerList() throws Exception {
        String phone = newPhone();
        String t = register(phone);
        ok(call("POST", "/api/support-requests", t, "{\"kind\":\"problem\",\"message\":\"The app froze on the review step.\",\"contactPhone\":\"" + phone + "\"}"), 201);
        String s = staff();
        boolean found = false;
        for (JsonNode i : ok(call("GET", "/api/admin/support", s, null), 200)) if (i.get("message").asString().contains("froze")) found = true;
        assertTrue(found);
        boolean listed = false;
        for (JsonNode c : ok(call("GET", "/api/admin/customers", s, null), 200)) if (phone.equals(c.get("phone").asString())) listed = true;
        assertTrue(listed);
        assertEquals(401, call("GET", "/api/admin/customers", t, null).statusCode());
        assertEquals(422, call("POST", "/api/admin/support/x/status", s, "{\"status\":\"bogus\"}").statusCode());
    }
}
