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

    @Test void staffScheduleADeliveryOnlyForApprovedClaimsAndTheFamilySeesIt() throws Exception {
        String t = customer(), s = staff();
        String claimId = claim(t, s)[0];
        String day = TestData.today().plusDays(3).toString();
        String body = "{\"date\":\"" + day + "\",\"window\":\"morning\",\"note\":\"Please have someone home.\"}";
        assertEquals(422, call("POST", "/api/admin/claims/" + claimId + "/delivery", s, body).statusCode());           // not approved yet
        ok(call("POST", "/api/admin/claims/" + claimId + "/status", s, "{\"status\":\"under_review\"}"), 200);
        ok(upload(t, claimId, "death_certificate", "c.pdf", pdf("c", 20)), 201);
        ok(call("POST", "/api/admin/claims/" + claimId + "/status", s, "{\"status\":\"approved\"}"), 200);

        assertEquals(422, call("POST", "/api/admin/claims/" + claimId + "/delivery", s, "{\"date\":\"" + TestData.today().minusDays(1) + "\"}").statusCode());   // the past
        assertEquals(400, call("POST", "/api/admin/claims/" + claimId + "/delivery", s, "{\"date\":\"" + day + "\",\"window\":\"midnight\"}").statusCode());   // unknown window
        assertEquals(401, call("POST", "/api/admin/claims/" + claimId + "/delivery", t, body).statusCode());              // customers can't

        JsonNode scheduled = ok(call("POST", "/api/admin/claims/" + claimId + "/delivery", s, body), 200);
        assertEquals(day, scheduled.get("deliveryDate").asString());
        JsonNode mine = ok(call("GET", "/api/claims", t, null), 200).get(0);
        assertEquals(day, mine.get("deliveryDate").asString());
        assertEquals("morning", mine.get("deliveryWindow").asString());
        assertEquals("Please have someone home.", mine.get("deliveryNote").asString());
        assertTrue(mine.get("deliveredAt").isNull());

        ok(call("POST", "/api/admin/claims/" + claimId + "/status", s, "{\"status\":\"delivered\"}"), 200);
        assertFalse(ok(call("GET", "/api/claims", t, null), 200).get(0).get("deliveredAt").isNull());
        assertEquals(422, call("POST", "/api/admin/claims/" + claimId + "/delivery", s, body).statusCode());           // already delivered
        assertTrue(call("GET", "/api/admin/audit", s, null).body().contains("claim.delivery.scheduled"));
    }

    @Test void collectionsViewIsStaffOnlyAndListsActiveCoversThatAreDue() throws Exception {
        String t = customer(), s = staff();
        assertEquals(401, call("GET", "/api/admin/collections", t, null).statusCode());
        claim(t, s);   // an active cover paid up to date
        JsonNode view = ok(call("GET", "/api/admin/collections", s, null), 200);
        assertTrue(view.get("active").asInt() >= 1);
        assertEquals(2, view.get("lapseAfter").asInt());
        assertEquals(0, view.get("behind").asInt());        // nothing can be behind on day one
        for (JsonNode row : view.get("rows")) assertEquals(0, row.get("missed").asInt());
    }

    private JsonNode inbox(String token) throws Exception { return ok(call("GET", "/api/me/notifications", token, null), 200); }
    private boolean hasTitle(JsonNode inbox, String title) { for (JsonNode n : inbox.get("items")) if (title.equals(n.get("title").asString())) return true; return false; }

    @Test void customersGetPlainMessagesAsTheirCoverAndClaimMove() throws Exception {
        String t = customer(), other = customer(), s = staff();
        assertEquals(0, inbox(t).get("unread").asInt());
        JsonNode p = ok(call("POST", "/api/policies", t, "{\"items\":[{\"itemId\":\"grocery-5000\",\"quantity\":1}],\"holderIdNumber\":\"" + TestData.HOLDER_ID + "\",\"debitDay\":25,\"members\":[]" + consent() + "}"), 201);
        String pid = p.get("id").asString();
        ok(call("POST", "/api/admin/policies/" + pid + "/status", s, "{\"status\":\"approved\"}"), 200);
        assertTrue(hasTitle(inbox(t), "Your application is approved"));
        ok(call("POST", "/api/admin/policies/" + pid + "/payments", s, "{\"amountCents\":" + p.get("monthlyTotalCents").asLong() + ",\"paidOn\":\"" + TestData.today() + "\",\"reference\":\"EFT-N\"}"), 201);
        JsonNode box = inbox(t);
        assertTrue(hasTitle(box, "Your cover is active"));
        assertTrue(hasTitle(box, "Payment received"));
        assertEquals(3, box.get("unread").asInt());
        assertEquals(0, inbox(other).get("items").size());                          // nobody else's messages

        String id = box.get("items").get(0).get("id").asString();
        assertEquals(204, call("POST", "/api/me/notifications/" + id + "/read", t, null).statusCode());
        assertEquals(2, inbox(t).get("unread").asInt());
        assertEquals(404, call("POST", "/api/me/notifications/" + id + "/read", other, null).statusCode());
        assertEquals(204, call("POST", "/api/me/notifications/read-all", t, null).statusCode());
        assertEquals(0, inbox(t).get("unread").asInt());
        assertEquals(401, call("GET", "/api/me/notifications", null, null).statusCode());
    }

    @Test void switchedOffKindsAreNotAddedButCoverMessagesAre() throws Exception {
        String t = customer(), s = staff();
        ok(call("PUT", "/api/me/notifications", t, "{\"claims\":false,\"payments\":false,\"news\":false}"), 200);
        String claimId = claim(t, s)[0];                                                                     // approve + pay happen inside
        JsonNode box = inbox(t);
        assertTrue(hasTitle(box, "Your cover is active"));                                                   // always kept
        assertFalse(hasTitle(box, "Payment received"));                                                      // switched off
        ok(call("POST", "/api/admin/claims/" + claimId + "/status", s, "{\"status\":\"under_review\"}"), 200);
        assertFalse(hasTitle(inbox(t), "We're looking at your claim"));
        ok(call("PUT", "/api/me/notifications", t, "{\"claims\":true,\"payments\":true,\"news\":false}"), 200);
        ok(upload(t, claimId, "death_certificate", "c.pdf", pdf("c", 20)), 201);
        ok(call("POST", "/api/admin/claims/" + claimId + "/status", s, "{\"status\":\"approved\"}"), 200);
        ok(call("POST", "/api/admin/claims/" + claimId + "/delivery", s, "{\"date\":\"" + TestData.today().plusDays(2) + "\"}"), 200);
        ok(call("POST", "/api/admin/claims/" + claimId + "/status", s, "{\"status\":\"delivered\"}"), 200);
        JsonNode after = inbox(t);
        assertTrue(hasTitle(after, "Your claim is approved"));
        assertTrue(hasTitle(after, "Your bundle was delivered"));
        assertTrue(after.toString().contains("Delivery planned for"));
        assertEquals("claim", after.get("items").get(0).get("refType").asString());
    }

    // ---------- cash alternative and one-claim-per-person ----------

    @Test void theCashAlternativeIsFrozenFromOurCostAndCustomersNeverSeeTheCost() throws Exception {
        String t = customer(), s = staff();
        String claimId = claim(t, s)[0];
        JsonNode mine = ok(call("GET", "/api/claims", t, null), 200).get(0);
        assertEquals("bundle", mine.get("benefitChoice").asString());                       // the bundle is the default
        long cash = mine.get("cashAlternativeCents").asLong();
        assertTrue(cash > 0 && cash < mine.get("bundle").get("bundleValueCents").asLong(), "cash is less than the bundle is worth at shop prices");
        assertTrue(mine.get("ourCostCents").isNull(), "customers must never see what the bundle costs us");

        JsonNode staffView = null;
        for (JsonNode c : ok(call("GET", "/api/admin/claims", s, null), 200)) if (claimId.equals(c.get("id").asString())) staffView = c;
        assertNotNull(staffView);
        assertEquals(cash, staffView.get("ourCostCents").asLong());                          // at cost by default, so cash never costs us more than the bundle
    }

    @Test void theFamilyCanChooseCashAndChangeTheirMindUntilTheClaimIsSettled() throws Exception {
        String t = customer(), other = customer(), s = staff();
        String claimId = claim(t, s)[0];
        assertEquals(400, call("PUT", "/api/claims/" + claimId + "/choice", t, "{\"choice\":\"gold\"}").statusCode());
        assertEquals(404, call("PUT", "/api/claims/" + claimId + "/choice", other, "{\"choice\":\"cash\"}").statusCode());
        assertEquals("cash", ok(call("PUT", "/api/claims/" + claimId + "/choice", t, "{\"choice\":\"cash\"}"), 200).get("benefitChoice").asString());

        ok(upload(t, claimId, "death_certificate", "c.pdf", pdf("c", 20)), 201);
        ok(call("POST", "/api/admin/claims/" + claimId + "/status", s, "{\"status\":\"under_review\"}"), 200);
        ok(call("POST", "/api/admin/claims/" + claimId + "/status", s, "{\"status\":\"approved\"}"), 200);
        // nothing to deliver when the family took cash
        assertEquals(422, call("POST", "/api/admin/claims/" + claimId + "/delivery", s, "{\"date\":\"" + TestData.today().plusDays(2) + "\"}").statusCode());
        assertEquals("bundle", ok(call("PUT", "/api/claims/" + claimId + "/choice", t, "{\"choice\":\"bundle\"}"), 200).get("benefitChoice").asString());
        ok(call("POST", "/api/admin/claims/" + claimId + "/delivery", s, "{\"date\":\"" + TestData.today().plusDays(2) + "\"}"), 200);      // back to the bundle: delivery works again
        ok(call("PUT", "/api/claims/" + claimId + "/choice", t, "{\"choice\":\"cash\"}"), 200);
        JsonNode afterCash = ok(call("GET", "/api/claims", t, null), 200).get(0);
        assertTrue(afterCash.get("deliveryDate").isNull(), "choosing cash clears the delivery plan");

        ok(call("POST", "/api/admin/claims/" + claimId + "/status", s, "{\"status\":\"delivered\"}"), 200);                              // settled
        assertTrue(hasTitle(t, "Your payment was made"));
        assertEquals(422, call("PUT", "/api/claims/" + claimId + "/choice", t, "{\"choice\":\"bundle\"}").statusCode());
    }

    @Test void thePersonCannotBeClaimedForTwiceUnlessTheFirstClaimWasDeclined() throws Exception {
        String t = customer(), s = staff();
        String[] ids = claim(t, s);
        String today = TestData.today().toString();
        String again = "{\"policyId\":\"" + ids[1] + "\",\"dateOfDeath\":\"" + today + "\",\"causeOfDeath\":\"accidental\",\"claimantName\":\"Thandi\",\"claimantPhone\":\"+27821234567\","
                + "\"delivery\":{\"recipientName\":\"Sipho\",\"recipientPhone\":\"+27715550000\",\"addressLine\":\"12 Street\",\"suburb\":\"Seshego\",\"city\":\"Polokwane\",\"province\":\"Limpopo\",\"postalCode\":\"0742\"}}";
        HttpResponse<String> dup = call("POST", "/api/claims", t, again);
        assertEquals(422, dup.statusCode());
        assertTrue(dup.body().contains("already a claim"), dup.body());
        ok(call("POST", "/api/admin/claims/" + ids[0] + "/status", s, "{\"status\":\"declined\",\"note\":\"Submitted by mistake.\",\"madeInError\":true}"), 200);
        ok(call("POST", "/api/claims", t, again), 201);                                        // a declined claim doesn't block a fresh one
    }

    private boolean hasTitle(String token, String title) throws Exception {
        for (JsonNode n : ok(call("GET", "/api/me/notifications", token, null), 200).get("items")) if (title.equals(n.get("title").asString())) return true;
        return false;
    }
}
