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
class StaffLoginLockTest {
    @LocalServerPort int port;

    private int login(String email, String password) throws Exception {
        String body = "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/admin/auth/login")).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString()).statusCode();
    }

    @Test void guessingAStaffPasswordIsStoppedAfterFiveTries() throws Exception {
        for (int i = 0; i < 5; i++) assertEquals(401, login("guess@tgn.local", "wrong-" + i));
        assertEquals(429, login("guess@tgn.local", "wrong-6"));
        assertEquals(429, login("Guess@tgn.local", "wrong-7"));   // case does not dodge it
    }
}
