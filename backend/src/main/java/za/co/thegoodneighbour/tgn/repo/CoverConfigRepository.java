package za.co.thegoodneighbour.tgn.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.CoverConfig;

public interface CoverConfigRepository extends JpaRepository<CoverConfig, String> {
}
