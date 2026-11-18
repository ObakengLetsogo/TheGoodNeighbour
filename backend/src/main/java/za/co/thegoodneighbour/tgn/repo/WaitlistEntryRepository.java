package za.co.thegoodneighbour.tgn.repo;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.WaitlistEntry;

public interface WaitlistEntryRepository extends JpaRepository<WaitlistEntry, String> {
    List<WaitlistEntry> findAllByOrderByCreatedAtDesc();
    boolean existsByPhone(String phone);
    boolean existsByEmail(String email);
}
