package za.co.thegoodneighbour.tgn.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.FuneralWish;

public interface FuneralWishRepository extends JpaRepository<FuneralWish, String> {
    List<FuneralWish> findByPolicyId(String policyId);
    Optional<FuneralWish> findByPolicyIdAndMemberKey(String policyId, String memberKey);
}
