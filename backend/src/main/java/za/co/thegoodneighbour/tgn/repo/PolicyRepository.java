package za.co.thegoodneighbour.tgn.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.Policy;

public interface PolicyRepository extends JpaRepository<Policy, String> {
    List<Policy> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Policy> findByIdAndUserId(String id, String userId);
    List<Policy> findByStatusOrderByCreatedAtDesc(String status);
    List<Policy> findAllByOrderByCreatedAtDesc();
}
