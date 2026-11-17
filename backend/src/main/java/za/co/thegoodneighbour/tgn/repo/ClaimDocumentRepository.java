package za.co.thegoodneighbour.tgn.repo;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.ClaimDocument;

public interface ClaimDocumentRepository extends JpaRepository<ClaimDocument, String> {
    List<ClaimDocument> findByClaimIdOrderByCreatedAtAsc(String claimId);
}
