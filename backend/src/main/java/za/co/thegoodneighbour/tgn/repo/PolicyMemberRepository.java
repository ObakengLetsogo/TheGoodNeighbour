package za.co.thegoodneighbour.tgn.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.PolicyMember;

public interface PolicyMemberRepository extends JpaRepository<PolicyMember, String> {

}
