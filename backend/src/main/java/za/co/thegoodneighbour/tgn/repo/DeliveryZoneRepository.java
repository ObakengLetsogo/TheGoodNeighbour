package za.co.thegoodneighbour.tgn.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.DeliveryZone;

public interface DeliveryZoneRepository extends JpaRepository<DeliveryZone, String> {

}
