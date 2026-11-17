package za.co.thegoodneighbour.tgn.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.LegalDocument;

public interface LegalDocumentRepository extends JpaRepository<LegalDocument, String> {
}
