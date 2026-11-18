package za.co.thegoodneighbour.tgn.service;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.api.Dtos.NotificationDto;
import za.co.thegoodneighbour.tgn.api.Dtos.NotificationsDto;
import za.co.thegoodneighbour.tgn.domain.AppUser;
import za.co.thegoodneighbour.tgn.domain.Notification;
import za.co.thegoodneighbour.tgn.repo.AppUserRepository;
import za.co.thegoodneighbour.tgn.repo.NotificationRepository;

/**
 * The in-app inbox. Cover messages (approved, started, lapsed) are always kept because they matter. Payment and claim
 * messages follow the customer's notification settings. Sending these out by SMS or push comes later, with a provider.
 */
@Service
public class NotificationService {
    private final NotificationRepository notifications;
    private final AppUserRepository users;

    public NotificationService(NotificationRepository notifications, AppUserRepository users) { this.notifications = notifications; this.users = users; }

    /** Adds a message to the customer's inbox unless they have switched that kind off. Joins the caller's transaction. */
    public void notify(String userId, String category, String title, String body, String refType, String refId) {
        AppUser u = users.findById(userId).orElse(null);
        if (u == null) return;
        if ("payment".equals(category) && !u.isNotifyPayments()) return;
        if ("claim".equals(category) && !u.isNotifyClaims()) return;
        notifications.save(new Notification(userId, category, title, body, refType, refId));
    }

    @Transactional(readOnly = true)
    public NotificationsDto list(AppUser u) {
        List<NotificationDto> items = notifications.findTop50ByUserIdOrderByCreatedAtDesc(u.getId()).stream().map(NotificationService::toDto).toList();
        return new NotificationsDto(notifications.countByUserIdAndReadAtIsNull(u.getId()), items);
    }

    @Transactional
    public void markRead(AppUser u, String id) {
        notifications.findByIdAndUserId(id, u.getId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "We can't find that message.")).markRead();
    }

    @Transactional
    public void markAllRead(AppUser u) { notifications.findByUserIdAndReadAtIsNull(u.getId()).forEach(Notification::markRead); }

    private static NotificationDto toDto(Notification n) {
        return new NotificationDto(n.getId(), n.getCategory(), n.getTitle(), n.getBody(), n.getRefType(), n.getRefId(), n.getReadAt() != null,
                DateTimeFormatter.ISO_INSTANT.format(n.getCreatedAt().atOffset(ZoneOffset.UTC)));
    }
}
