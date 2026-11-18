package za.co.thegoodneighbour.tgn.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import za.co.thegoodneighbour.tgn.domain.Notification;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findTop50ByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Notification> findByIdAndUserId(String id, String userId);
    long countByUserIdAndReadAtIsNull(String userId);
    List<Notification> findByUserIdAndReadAtIsNull(String userId);
    @Modifying @Query("delete from Notification n where n.userId = ?1") void deleteByUserId(String userId);
}
