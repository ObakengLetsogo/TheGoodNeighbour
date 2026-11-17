package za.co.thegoodneighbour.tgn.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.SupportRequest;

public interface SupportRequestRepository extends JpaRepository<SupportRequest, String> {

}
