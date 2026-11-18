package za.co.thegoodneighbour.tgn.repo;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.PolicyContributor;

public interface PolicyContributorRepository extends JpaRepository<PolicyContributor, String> {
    List<PolicyContributor> findByPolicyIdOrderByInvitedAtAsc(String policyId);
    List<PolicyContributor> findByPhoneAndStatus(String phone, String status);
    List<PolicyContributor> findByUserIdAndStatus(String userId, String status);
    void deleteByUserId(String userId);
    void deleteByPhone(String phone);
}
