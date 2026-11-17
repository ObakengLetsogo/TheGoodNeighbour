package za.co.thegoodneighbour.tgn;

import java.time.LocalDate;
import java.time.ZoneId;

/** Test people of a given AGE, so results don't change as the calendar moves people between price bands. */
final class TestData {
    private TestData() {}

    static LocalDate today() { return LocalDate.now(ZoneId.of("Africa/Johannesburg")); }

    /** A birth date that makes someone exactly `years` old today plus 40 days (so the age stays put for weeks). */
    static LocalDate dobAged(int years) { return today().minusYears(years).minusDays(40); }

    /** A valid South African ID number for this date of birth. `seq` makes different people. */
    static String saId(LocalDate dob, int seq) {
        String base = String.format("%02d%02d%02d", dob.getYear() % 100, dob.getMonthValue(), dob.getDayOfMonth()) + String.format("%04d", 5000 + seq) + "08";
        int sum = 0;
        boolean dbl = true;   // the check digit will be appended, so double starting from the right-most existing digit
        for (int i = base.length() - 1; i >= 0; i--) {
            int d = base.charAt(i) - '0';
            if (dbl) { d *= 2; if (d > 9) d -= 9; }
            sum += d;
            dbl = !dbl;
        }
        return base + ((10 - sum % 10) % 10);
    }

    /** The main member: 30 years old, so they are in the 18 to 35 band (100%). */
    static final String HOLDER_ID = saId(dobAged(30), 0);

    static String member(String relationship, String name, int age, boolean withId, int seq) {
        LocalDate dob = dobAged(age);
        return "{\"relationship\":\"" + relationship + "\",\"fullName\":\"" + name + "\"" + (withId ? ",\"idNumber\":\"" + saId(dob, seq) + "\"" : "") + ",\"dateOfBirth\":\"" + dob + "\"}";
    }
}
