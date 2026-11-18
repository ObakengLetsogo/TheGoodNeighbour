package za.co.thegoodneighbour.tgn.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.Claim;

public interface ClaimRepository extends JpaRepository<Claim, String> {
    List<Claim> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Claim> findAllByOrderByCreatedAtDesc();
    List<Claim> findByPolicyId(String policyId);
}
