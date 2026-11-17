package za.co.thegoodneighbour.tgn;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import za.co.thegoodneighbour.tgn.config.PiiCrypto;
import za.co.thegoodneighbour.tgn.config.TgnProperties;

class PiiCryptoTest {
    private static PiiCrypto crypto(String key, String... profiles) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(profiles);
        return new PiiCrypto(new TgnProperties(null, false, key, null, null, "log", null), env);
    }

    @Test void encryptsWithAFreshIvAndRoundTrips() {
        PiiCrypto c = crypto(Base64.getEncoder().encodeToString(new byte[32]));
        String a = c.convertToDatabaseColumn("9001015000085"), b = c.convertToDatabaseColumn("9001015000085");
        assertNotEquals("9001015000085", a);
        assertNotEquals(a, b);
        assertEquals("9001015000085", c.convertToEntityAttribute(a));
        assertNull(c.convertToDatabaseColumn(null));
    }

    @Test void tamperedDataIsRejected() {
        PiiCrypto c = crypto(Base64.getEncoder().encodeToString(new byte[32]));
        byte[] raw = Base64.getDecoder().decode(c.convertToDatabaseColumn("9001015000085"));
        raw[raw.length - 1] ^= 1;
        assertThrows(IllegalStateException.class, () -> c.convertToEntityAttribute(Base64.getEncoder().encodeToString(raw)));
    }

    @Test void productionRefusesToStartWithoutAKey() {
        assertThrows(IllegalStateException.class, () -> crypto("", "prod"));
        assertDoesNotThrow(() -> crypto(""));
    }
}
