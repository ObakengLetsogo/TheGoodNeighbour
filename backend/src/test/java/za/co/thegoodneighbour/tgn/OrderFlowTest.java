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

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderFlowTest {
    @LocalServerPort int port;
    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = JsonMapper.builder().build();

    private HttpResponse<String> call(String method, String path, String token, String body) throws Exception {
        var b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).header("Content-Type", "application/json");
        if (token != null) b.header("Authorization", "Bearer " + token);
        b.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private String register(String phone) throws Exception {
        var res = call("POST", "/api/auth/register", null,
                "{\"fullName\":\"Thandi Mokoena\",\"phone\":\"" + phone + "\",\"password\":\"password123\"}");
        assertEquals(201, res.statusCode(), res.body());
        return json.readTree(res.body()).get("token").asString();
    }

    private static final String ORDER = """
        {"basket":{"lines":[
           {"productId":"sheep","variantId":"standard","quantity":2,"serviceOptions":[{"id":"prep-sheep"}],"packageInstanceId":"i1","unitPriceCents":1},
           {"productId":"rice","variantId":"10kg","quantity":1}
         ],"packages":[{"instanceId":"i1","packageId":"pkg-gathering"}]},
         "delivery":{"recipientName":"Sipho","recipientPhone":"+27715550000","addressLine":"12 Street","suburb":"Seshego",
           "city":"Polokwane","provinceCode":"LP","postalCode":"0742","date":"2030-01-01","window":"morning"}}
        """;

    @Test
    void catalogueIsPublicAndComplete() throws Exception {
        var res = call("GET", "/api/catalog", null, null);
        assertEquals(200, res.statusCode());
        JsonNode c = json.readTree(res.body());
        assertTrue(c.get("products").size() > 10);
        assertEquals(4, c.get("packages").size());
        assertEquals(9, c.get("deliveryZones").size());
    }

    @Test
    void ordersRequireSignIn() throws Exception {
        assertEquals(401, call("GET", "/api/orders", null, null).statusCode());
        assertEquals(401, call("POST", "/api/orders", "bogus", ORDER).statusCode());
    }

    @Test
    void ordersArePricedByTheServerAndStayUnpaid() throws Exception {
        String token = register("+27821110001");
        var res = call("POST", "/api/orders", token, ORDER);
        assertEquals(201, res.statusCode(), res.body());
        JsonNode o = json.readTree(res.body());
        // sheep 2 x (R3 200 + R450 prep) = R7 300, rice R215 -> items R7 515. Client's "unitPriceCents":1 is ignored.
        assertEquals(751_500, o.get("totals").get("itemsCents").asLong());
        assertEquals(36_500, o.get("totals").get("packageSavingCents").asLong()); // 5% of R7 300
        assertEquals(45_000, o.get("totals").get("deliveryCents").asLong());      // Limpopo
        assertEquals(751_500 - 36_500 + 45_000, o.get("totals").get("totalCents").asLong());
        assertEquals("order_received", o.get("status").asString());
        assertEquals("awaiting_payment", o.get("paymentStatus").asString()); // never claims payment

        assertEquals(1, json.readTree(call("GET", "/api/orders", token, null).body()).size());
    }

    @Test
    void customersCannotSeeEachOthersOrders() throws Exception {
        String a = register("+27821110002");
        String b = register("+27821110003");
        String id = json.readTree(call("POST", "/api/orders", a, ORDER).body()).get("id").asString();
        assertEquals(200, call("GET", "/api/orders/" + id, a, null).statusCode());
        assertEquals(404, call("GET", "/api/orders/" + id, b, null).statusCode());
    }

    @Test
    void rejectsUnknownProductsAndBadPhones() throws Exception {
        String token = register("+27821110004");
        assertEquals(422, call("POST", "/api/orders", token, ORDER.replace("\"rice\"", "\"unicorn\"")).statusCode());
        assertEquals(400, call("POST", "/api/orders", token, ORDER.replace("+27715550000", "12345")).statusCode());
        assertEquals(400, call("POST", "/api/auth/register", null, "{\"fullName\":\"X Y\",\"phone\":\"0821234567\",\"password\":\"password123\"}").statusCode());
    }
}
