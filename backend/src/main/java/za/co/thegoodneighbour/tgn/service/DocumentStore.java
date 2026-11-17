package za.co.thegoodneighbour.tgn.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.UUID;
import org.springframework.stereotype.Service;
import za.co.thegoodneighbour.tgn.config.PiiCrypto;
import za.co.thegoodneighbour.tgn.config.TgnProperties;

/** Keeps uploaded files encrypted on disk. Files are never stored or served as plain text. */
@Service
public class DocumentStore {
    private final Path dir;
    private final PiiCrypto crypto;

    public DocumentStore(TgnProperties props, PiiCrypto crypto) throws IOException {
        this.crypto = crypto;
        this.dir = Path.of(props.storageDir() != null ? props.storageDir() : System.getProperty("java.io.tmpdir") + "/tgn-uploads");
        Files.createDirectories(dir);
    }

    public String save(byte[] plain) {
        String key = UUID.randomUUID().toString();
        try { Files.write(dir.resolve(key), crypto.encryptBytes(plain), StandardOpenOption.CREATE_NEW); }
        catch (IOException e) { throw new IllegalStateException("Couldn't store the file", e); }
        return key;
    }

    public byte[] load(String key) {
        if (key.contains("/") || key.contains("\\") || key.contains("..")) throw new IllegalArgumentException("Bad key");
        try { return crypto.decryptBytes(Files.readAllBytes(dir.resolve(key))); }
        catch (IOException e) { throw new IllegalStateException("Couldn't read the file", e); }
    }

    public void delete(String key) {
        try { Files.deleteIfExists(dir.resolve(key)); } catch (IOException ignored) { /* best effort */ }
    }

    public Path directory() { return dir; }
}
