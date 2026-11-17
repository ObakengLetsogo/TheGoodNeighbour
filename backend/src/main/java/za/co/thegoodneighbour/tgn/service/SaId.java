package za.co.thegoodneighbour.tgn.service;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.Optional;

/** South African ID number checks: 13 digits, a real YYMMDD birth date, and the Luhn check digit. */
public final class SaId {
    private SaId() {}

    /** @return the date of birth encoded in the ID, or empty if the number is not a valid SA ID. */
    public static Optional<LocalDate> dateOfBirth(String id, LocalDate today) {
        if (id == null || !id.matches("\\d{13}") || !luhn(id)) return Optional.empty();
        int yy = Integer.parseInt(id.substring(0, 2));
        int year = yy <= today.getYear() % 100 ? 2000 + yy : 1900 + yy;
        try {
            return Optional.of(LocalDate.of(year, Integer.parseInt(id.substring(2, 4)), Integer.parseInt(id.substring(4, 6))));
        } catch (DateTimeException e) {
            return Optional.empty();
        }
    }

    static boolean luhn(String digits) {
        int sum = 0;
        boolean dbl = false;
        for (int i = digits.length() - 1; i >= 0; i--) {
            int d = digits.charAt(i) - '0';
            if (dbl) { d *= 2; if (d > 9) d -= 9; }
            sum += d;
            dbl = !dbl;
        }
        return sum % 10 == 0;
    }

    public static String mask(String id) {
        return id == null || id.length() < 4 ? null : "*********" + id.substring(id.length() - 4);
    }
}
