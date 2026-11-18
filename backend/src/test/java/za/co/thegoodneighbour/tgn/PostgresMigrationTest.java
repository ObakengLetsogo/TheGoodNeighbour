package za.co.thegoodneighbour.tgn;

import static org.junit.jupiter.api.Assertions.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.json.JsonMapper;

/**
 * Runs the migrations and the whole app against a REAL PostgreSQL database, which is what production uses. Skipped unless
 * TGN_TEST_POSTGRES_URL is set, so nobody needs a database just to run the normal tests. Point it at an EMPTY database:
 *
 *   TGN_TEST_POSTGRES_URL=jdbc:postgresql://localhost:5432/tgn_migrate TGN_TEST_POSTGRES_USER=tgn TGN_TEST_POSTGRES_PASSWORD=... mvn test -Dtest=PostgresMigrationTest
 *
 * The app starts with ddl-auto=validate, so if an entity and the migrations disagree on PostgreSQL, the context fails to start.
 */
@EnabledIfEnvironmentVariable(named = "TGN_TEST_POSTGRES_URL", matches = ".+")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=${TGN_TEST_POSTGRES_URL:}", "spring.datasource.username=${TGN_TEST_POSTGRES_USER:tgn}",
        "spring.datasource.password=${TGN_TEST_POSTGRES_PASSWORD:}", "spring.datasource.driver-class-name=org.postgresql.Driver",
        "tgn.seed-base-rate-bps=160"})
class PostgresMigrationTest {
    @LocalServerPort int port;
    @Autowired DataSource dataSource;
    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = JsonMapper.builder().build();

    @Test void migrationsApplyAndTheAppWorksOnPostgres() throws Exception {
        try (var c = dataSource.getConnection(); var st = c.createStatement()) {
            assertEquals("PostgreSQL", c.getMetaData().getDatabaseProductName());
            var rs = st.executeQuery("select count(*), max(version::int) from flyway_schema_history where success");
            rs.next();
            assertTrue(rs.getInt(1) >= 2, "baseline and indexes should both be recorded");
            rs = st.executeQuery("select count(*) from pg_indexes where indexname = 'idx_policies_user'");
            rs.next();
            assertEquals(1, rs.getInt(1));
        }
        // The seeded catalogue is served, and a customer can register and join the waiting list on PostgreSQL.
        var cover = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/cover")).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, cover.statusCode());
        assertTrue(json.readTree(cover.body()).get("items").size() > 0);
        var reg = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/register")).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"fullName\":\"Pg Test\",\"phone\":\"+27821119999\",\"password\":\"password123\"}")).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(201, reg.statusCode(), reg.body());
        var wl = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/waitlist")).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"firstName\":\"Pg\",\"email\":\"pg@example.com\",\"consent\":true}")).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(202, wl.statusCode(), wl.body());
    }
}
