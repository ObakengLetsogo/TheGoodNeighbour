package za.co.thegoodneighbour.tgn;

import static org.junit.jupiter.api.Assertions.*;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import za.co.thegoodneighbour.tgn.payment.LoggingSmsGateway;
import za.co.thegoodneighbour.tgn.service.DocumentStore;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "tgn.bootstrap-admin-email=staff@tgn.test", "tgn.bootstrap-admin-password=correct-horse-battery", "tgn.seed-base-rate-bps=160"})
class DocumentFlowTest {
    @LocalServerPort int port;
    @Autowired LoggingSmsGateway sms;
    @Autowired DocumentStore store;
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

    private HttpResponse<String> upload(String token, String claimId, String type, String fileName, byte[] content) throws Exception {
        String boundary = "----tgn" + System.nanoTime();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"type\"\r\n\r\n" + type + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + fileName + "\"\r\nContent-Type: application/octet-stream\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(content);
        out.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        var b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/claims/" + claimId + "/documents"))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary).header("Authorization", "Bearer " + token)
                .POST(HttpRequest.BodyPublishers.ofByteArray(out.toByteArray()));
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<byte[]> bytes(String path, String token) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).header("Authorization", "Bearer " + token).GET().build(), HttpResponse.BodyHandlers.ofByteArray());
    }

    private String customer() throws Exception {
        String phone = "+2782777" + String.format("%04d", ++seq);
        String t = ok(call("POST", "/api/auth/register", null, "{\"fullName\":\"Thandi Mokoena\",\"phone\":\"" + phone + "\",\"password\":\"password123\"}"), 201).get("token").asString();
        ok(call("POST", "/api/me/phone-verification/start", t, null), 202);
        ok(call("POST", "/api/me/phone-verification/confirm", t, "{\"code\":\"" + sms.lastMessageTo(phone).replaceAll("^.*is (\\d{6}).*$", "$1") + "\"}"), 200);
        return t;
    }

    private String staff() throws Exception {
        return ok(call("POST", "/api/admin/auth/login", null, "{\"email\":\"staff@tgn.test\",\"password\":\"correct-horse-battery\"}"), 200).get("token").asString();
    }

    private String consent() throws Exception {
        int terms = 0, privacy = 0;
        for (JsonNode d : ok(call("GET", "/api/legal", null, null), 200)) { if ("terms".equals(d.get("slug").asString())) terms = d.get("version").asInt(); if ("privacy".equals(d.get("slug").asString())) privacy = d.get("version").asInt(); }
        return ",\"acceptedTermsVersion\":" + terms + ",\"acceptedPrivacyVersion\":" + privacy;
    }

    /** A customer with an active cover and a submitted claim. */
    private String[] claim(String t, String s) throws Exception {
        JsonNode p = ok(call("POST", "/api/policies", t, "{\"items\":[{\"itemId\":\"grocery-5000\",\"quantity\":1}],\"holderIdNumber\":\"" + TestData.HOLDER_ID + "\",\"debitDay\":25,\"members\":[]" + consent() + "}"), 201);
        String pid = p.get("id").asString();
        ok(call("POST", "/api/admin/policies/" + pid + "/status", s, "{\"status\":\"approved\"}"), 200);
        ok(call("POST", "/api/admin/policies/" + pid + "/payments", s, "{\"amountCents\":" + p.get("monthlyTotalCents").asLong() + ",\"paidOn\":\"" + TestData.today() + "\",\"reference\":\"EFT-D\"}"), 201);
        JsonNode c = ok(call("POST", "/api/claims", t, "{\"policyId\":\"" + pid + "\",\"dateOfDeath\":\"" + TestData.today() + "\",\"causeOfDeath\":\"accidental\",\"claimantName\":\"Thandi\",\"claimantPhone\":\"+27821234567\","
                + "\"delivery\":{\"recipientName\":\"Sipho\",\"recipientPhone\":\"+27715550000\",\"addressLine\":\"12 Street\",\"suburb\":\"Seshego\",\"city\":\"Polokwane\",\"province\":\"Limpopo\",\"postalCode\":\"0742\"}}"), 201);
        return new String[] { c.get("id").asString(), pid };
    }

    private static byte[] pdf(String marker, int extra) {
        StringBuilder sb = new StringBuilder("%PDF-1.4\n% " + marker + "\n");
        for (int i = 0; i < extra; i++) sb.append('x');
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Test void aClaimListsWhatIsStillNeededAndUploadsTickThemOff() throws Exception {
        String t = customer(), s = staff();
        String claimId = claim(t, s)[0];
        JsonNode before = ok(call("GET", "/api/claims", t, null), 200).get(0);
        assertEquals("death_certificate", before.get("missingDocuments").get(0).asString());
        assertEquals("deceased_id", before.get("missingDocuments").get(1).asString());      // the deceased is an adult

        JsonNode doc = ok(upload(t, claimId, "death_certificate", "certificate.pdf", pdf("certificate", 50)), 201);
        assertEquals("application/pdf", doc.get("contentType").asString());
        JsonNode after = ok(call("GET", "/api/claims", t, null), 200).get(0);
        assertEquals(1, after.get("documents").size());
        assertEquals(1, after.get("missingDocuments").size());
        ok(upload(t, claimId, "deceased_id", "id.jpg", new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 1, 2, 3 }), 201);
        assertEquals(0, ok(call("GET", "/api/claims", t, null), 200).get(0).get("missingDocuments").size());
    }

    @Test void onlyRealPdfJpegAndPngFilesUnderTheSizeLimitAreAccepted() throws Exception {
        String t = customer(), s = staff();
        String claimId = claim(t, s)[0];
        assertEquals(422, upload(t, claimId, "death_certificate", "notes.pdf", "just some text pretending to be a pdf".getBytes(StandardCharsets.UTF_8)).statusCode());  // wrong contents
        assertEquals(422, upload(t, claimId, "death_certificate", "virus.exe", new byte[] { 'M', 'Z', 1, 2, 3 }).statusCode());
        assertEquals(422, upload(t, claimId, "selfie", "a.pdf", pdf("x", 10)).statusCode());                                                                              // unknown type
        assertEquals(422, upload(t, claimId, "other", "empty.pdf", new byte[0]).statusCode());
        assertEquals(413, upload(t, claimId, "other", "huge.pdf", pdf("big", 5 * 1024 * 1024 + 10)).statusCode());                                                          // over 5 MB
        ok(upload(t, claimId, "other", "fine.pdf", pdf("fine", 10)), 201);
        ok(call("GET", "/api/claims", t, null), 200);
        for (int i = 0; i < 9; i++) ok(upload(t, claimId, "other", "f" + i + ".pdf", pdf("f" + i, 10)), 201);
        assertEquals(422, upload(t, claimId, "other", "eleven.pdf", pdf("11", 10)).statusCode());                                                                            // a limit of 10
    }

    @Test void filesAreEncryptedOnDiskAndFileNamesAreCleaned() throws Exception {
        String t = customer(), s = staff();
        String claimId = claim(t, s)[0];
        String marker = "SECRET-MARKER-" + System.nanoTime();
        byte[] content = pdf(marker, 100);
        JsonNode doc = ok(upload(t, claimId, "death_certificate", "../../etc/pass wd<script>.pdf", content), 201);
        assertFalse(doc.get("fileName").asString().contains("/"));
        assertFalse(doc.get("fileName").asString().contains("<"));
        boolean foundEncrypted = false;
        try (Stream<Path> files = Files.list(store.directory())) {
            for (Path f : (Iterable<Path>) files::iterator) {
                byte[] raw = Files.readAllBytes(f);
                assertFalse(new String(raw, StandardCharsets.ISO_8859_1).contains(marker), "a stored file contains the plain text");
                if (raw.length == content.length + 12 + 16) foundEncrypted = true;   // iv + ciphertext + GCM tag
            }
        }
        assertTrue(foundEncrypted);
    }

    @Test void onlyTheOwnerAndStaffCanReadAFileAndStaffViewsAreAudited() throws Exception {
        String t = customer(), other = customer(), s = staff();
        String claimId = claim(t, s)[0];
        byte[] content = pdf("mine", 200);
        String docId = ok(upload(t, claimId, "death_certificate", "c.pdf", content), 201).get("id").asString();

        HttpResponse<byte[]> mine = bytes("/api/claims/" + claimId + "/documents/" + docId + "/file", t);
        assertEquals(200, mine.statusCode());
        assertArrayEquals(content, mine.body());
        assertEquals("application/pdf", mine.headers().firstValue("Content-Type").orElse(""));
        assertEquals("nosniff", mine.headers().firstValue("X-Content-Type-Options").orElse(""));
        assertEquals(404, bytes("/api/claims/" + claimId + "/documents/" + docId + "/file", other).statusCode());
        assertEquals(404, upload(other, claimId, "other", "x.pdf", pdf("x", 5)).statusCode());
        assertEquals(401, bytes("/api/admin/claims/" + claimId + "/documents/" + docId + "/file", t).statusCode());

        HttpResponse<byte[]> staffView = bytes("/api/admin/claims/" + claimId + "/documents/" + docId + "/file", s);
        assertEquals(200, staffView.statusCode());
        assertArrayEquals(content, staffView.body());
        assertTrue(ok(call("GET", "/api/admin/audit", s, null), 200).toString().contains("claim.document.viewed"));
    }

    @Test void aClaimCannotBeApprovedWithoutADeathCertificateAndDocumentsLockOnceDecided() throws Exception {
        String t = customer(), s = staff();
        String claimId = claim(t, s)[0];
        ok(call("POST", "/api/admin/claims/" + claimId + "/status", s, "{\"status\":\"under_review\"}"), 200);
        assertEquals(422, call("POST", "/api/admin/claims/" + claimId + "/status", s, "{\"status\":\"approved\"}").statusCode());
        String docId = ok(upload(t, claimId, "death_certificate", "c.pdf", pdf("c", 20)), 201).get("id").asString();
        ok(call("POST", "/api/admin/claims/" + claimId + "/status", s, "{\"status\":\"approved\"}"), 200);
        assertEquals(422, upload(t, claimId, "other", "late.pdf", pdf("late", 5)).statusCode());                       // decided: no more changes
        assertEquals(422, call("DELETE", "/api/claims/" + claimId + "/documents/" + docId, t, null).statusCode());
    }

    @Test void aCustomerCanRemoveADocumentWhileTheClaimIsOpen() throws Exception {
        String t = customer(), s = staff();
        String claimId = claim(t, s)[0];
        String docId = ok(upload(t, claimId, "other", "wrong.pdf", pdf("w", 5)), 201).get("id").asString();
        assertEquals(204, call("DELETE", "/api/claims/" + claimId + "/documents/" + docId, t, null).statusCode());
        assertEquals(0, ok(call("GET", "/api/claims", t, null), 200).get(0).get("documents").size());
        assertEquals(404, bytes("/api/claims/" + claimId + "/documents/" + docId + "/file", t).statusCode());
    }
}
