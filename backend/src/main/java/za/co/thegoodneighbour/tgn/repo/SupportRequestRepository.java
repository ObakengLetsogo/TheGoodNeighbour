package za.co.thegoodneighbour.tgn.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.SupportRequest;

public interface SupportRequestRepository extends JpaRepository<SupportRequest, String> {

}
