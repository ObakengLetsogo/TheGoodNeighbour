package za.co.thegoodneighbour.tgn.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import za.co.thegoodneighbour.tgn.api.Dtos.WaitlistIn;
import za.co.thegoodneighbour.tgn.api.Dtos.WaitlistItemDto;
import za.co.thegoodneighbour.tgn.domain.StaffUser;
import za.co.thegoodneighbour.tgn.domain.WaitlistEntry;
import za.co.thegoodneighbour.tgn.repo.WaitlistEntryRepository;

/** The public "tell me when you open" list. Open to anyone, so it is rate limited and answers the same whether or not you are already on it. */
@Service
public class WaitlistService {
    private final int maxPerHour;
    private final WaitlistEntryRepository entries;
    private final AuditService audit;
    private final Clock clock;
    private final ConcurrentHashMap<String, Deque<Instant>> recent = new ConcurrentHashMap<>();

    public WaitlistService(WaitlistEntryRepository entries, AuditService audit, Clock clock,
                           @org.springframework.beans.factory.annotation.Value("${tgn.waitlist-per-hour:5}") int maxPerHour) {
        this.entries = entries; this.audit = audit; this.clock = clock; this.maxPerHour = maxPerHour;
    }

    public void join(String clientIp, WaitlistIn in) {
        // A hidden field real people never fill in. Bots do: pretend it worked and store nothing.
        if (in.website() != null && !in.website().isBlank()) return;
        String phone = blankToNull(in.phone());
        String email = blankToNull(in.email());
        if (email != null) email = email.toLowerCase(Locale.ROOT);
        if (phone == null && email == null) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Please give us a mobile number or an email address so we can reach you.");
        throttle(clientIp);
        boolean known = (phone != null && entries.existsByPhone(phone)) || (email != null && entries.existsByEmail(email));
        if (known) return;   // same answer as a new sign-up, so nobody can probe who is on the list
        entries.save(new WaitlistEntry(in.firstName().trim(), phone, email, blankToNull(in.province())));
    }

    public List<WaitlistItemDto> list() {
        return entries.findAllByOrderByCreatedAtDesc().stream()
                .map(e -> new WaitlistItemDto(e.getId(), e.getFirstName(), e.getPhone(), e.getEmail(), e.getProvince(), e.getCreatedAt().toString())).toList();
    }

    /** POPIA: someone can ask us to take them off the list. */
    public void remove(StaffUser staff, String id) {
        WaitlistEntry e = entries.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that entry."));
        entries.delete(e);
        audit.record(staff.getEmail(), "waitlist.removed", "waitlist", id, "Removed " + e.getFirstName() + " from the waiting list.");
    }

    private void throttle(String ip) {
        Instant now = clock.instant();
        Deque<Instant> q = recent.computeIfAbsent(ip == null ? "unknown" : ip, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && q.peekFirst().isBefore(now.minus(Duration.ofHours(1)))) q.pollFirst();
            if (q.size() >= maxPerHour) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "That's a lot of sign-ups from one connection. Please try again later.");
            q.addLast(now);
        }
        if (recent.size() > 10_000) recent.entrySet().removeIf(en -> en.getValue().isEmpty());
    }

    private static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
