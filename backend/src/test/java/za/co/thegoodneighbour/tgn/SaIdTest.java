package za.co.thegoodneighbour.tgn;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import za.co.thegoodneighbour.tgn.service.SaId;

class SaIdTest {
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 17);

    @Test void readsDateOfBirthFromAValidId() {
        assertEquals(LocalDate.of(1990, 1, 1), SaId.dateOfBirth("9001015000085", TODAY).orElseThrow());
        assertEquals(LocalDate.of(2015, 3, 10), SaId.dateOfBirth("1503105000089", TODAY).orElseThrow());
    }

    @Test void rejectsBadChecksumShapeAndImpossibleDates() {
        assertTrue(SaId.dateOfBirth("9001015000086", TODAY).isEmpty());  // wrong check digit
        assertTrue(SaId.dateOfBirth("900101500008", TODAY).isEmpty());   // 12 digits
        assertTrue(SaId.dateOfBirth("abcdefghijklm", TODAY).isEmpty());
        assertTrue(SaId.dateOfBirth(null, TODAY).isEmpty());
    }

    @Test void masksAllButLastFourDigits() {
        assertEquals("*********0085", SaId.mask("9001015000085"));
    }
}
