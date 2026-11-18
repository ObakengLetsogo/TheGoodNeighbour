package za.co.thegoodneighbour.tgn;

import static org.junit.jupiter.api.Assertions.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {"tgn.seed-base-rate-bps=160"})
class WaitlistLimitTest {
    @LocalServerPort int port;

    @Test void oneConnectionCannotFloodTheList() throws Exception {
        HttpClient http = HttpClient.newHttpClient();
        int accepted = 0, refused = 0;
        for (int i = 0; i < 9; i++) {
            String body = "{\"firstName\":\"Flood" + i + "\",\"phone\":\"+2782333" + String.format("%04d", i) + "\",\"consent\":true}";
            HttpResponse<String> r = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/waitlist")).header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
            if (r.statusCode() == 202) accepted++; else if (r.statusCode() == 429) refused++;
        }
        assertEquals(5, accepted);
        assertEquals(4, refused);
    }
}
