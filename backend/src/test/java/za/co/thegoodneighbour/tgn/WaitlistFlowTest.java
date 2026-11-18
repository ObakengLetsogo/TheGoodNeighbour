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
        "tgn.bootstrap-admin-email=staff@tgn.test", "tgn.bootstrap-admin-password=correct-horse-battery", "tgn.waitlist-per-hour=1000", "tgn.seed-base-rate-bps=160"})
class WaitlistFlowTest {
    @LocalServerPort int port;
    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = JsonMapper.builder().build();

    private HttpResponse<String> call(String method, String path, String token, String body) throws Exception {
        var b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).header("Content-Type", "application/json");
        if (token != null) b.header("Authorization", "Bearer " + token);
        b.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private String staff() throws Exception {
        return json.readTree(call("POST", "/api/admin/auth/login", null, "{\"email\":\"staff@tgn.test\",\"password\":\"correct-horse-battery\"}").body()).get("token").asString();
    }

    private static String body(String name, String phone, String email, boolean consent, String website) {
        return "{\"firstName\":\"" + name + "\"" + (phone == null ? "" : ",\"phone\":\"" + phone + "\"") + (email == null ? "" : ",\"email\":\"" + email + "\"")
                + ",\"province\":\"Limpopo\",\"consent\":" + consent + (website == null ? "" : ",\"website\":\"" + website + "\"") + "}";
    }

    private JsonNode list() throws Exception { return json.readTree(call("GET", "/api/admin/waitlist", staff(), null).body()); }
    private boolean has(String needle) throws Exception { return list().toString().contains(needle); }

    @Test void anyoneCanJoinWithAPhoneOrEmailAndStaffSeeIt() throws Exception {
        assertEquals(202, call("POST", "/api/waitlist", null, body("Naledi", "+27821110001", null, true, null)).statusCode());
        assertEquals(202, call("POST", "/api/waitlist", null, body("Pieter", null, "Pieter.Test@Example.com", true, null)).statusCode());
        assertTrue(has("+27821110001"));
        assertTrue(has("pieter.test@example.com"));     // stored lower-case
    }

    @Test void consentAndAWayToReachThemAreRequiredAndInputIsChecked() throws Exception {
        assertEquals(400, call("POST", "/api/waitlist", null, body("NoConsent", "+27821110002", null, false, null)).statusCode());
        assertEquals(422, call("POST", "/api/waitlist", null, body("NoContact", null, null, true, null)).statusCode());
        assertEquals(400, call("POST", "/api/waitlist", null, body("BadPhone", "0821110003", null, true, null)).statusCode());
        assertEquals(400, call("POST", "/api/waitlist", null, body("BadEmail", null, "not-an-email", true, null)).statusCode());
        assertFalse(has("NoConsent"));
    }

    @Test void signingUpTwiceLooksTheSameAndStoresOnce() throws Exception {
        assertEquals(202, call("POST", "/api/waitlist", null, body("Dup", "+27821110004", null, true, null)).statusCode());
        assertEquals(202, call("POST", "/api/waitlist", null, body("Dup", "+27821110004", null, true, null)).statusCode());
        assertEquals(1, list().toString().split("\\+27821110004", -1).length - 1);
    }

    @Test void aFilledInHiddenFieldMeansABotAndNothingIsStored() throws Exception {
        assertEquals(202, call("POST", "/api/waitlist", null, body("BotName", "+27821110005", null, true, "http://spam.example")).statusCode());
        assertFalse(has("BotName"));
    }

    @Test void listingAndRemovalNeedStaffAndRemovalIsAudited() throws Exception {
        assertEquals(202, call("POST", "/api/waitlist", null, body("Remove Me", "+27821110006", null, true, null)).statusCode());
        assertEquals(401, call("GET", "/api/admin/waitlist", null, null).statusCode());
        String s = staff();
        String id = null;
        for (JsonNode n : json.readTree(call("GET", "/api/admin/waitlist", s, null).body())) if ("Remove Me".equals(n.get("firstName").asString())) id = n.get("id").asString();
        assertNotNull(id);
        assertEquals(204, call("DELETE", "/api/admin/waitlist/" + id, s, null).statusCode());
        assertFalse(has("Remove Me"));
        assertTrue(call("GET", "/api/admin/audit", s, null).body().contains("waitlist.removed"));
    }
}
