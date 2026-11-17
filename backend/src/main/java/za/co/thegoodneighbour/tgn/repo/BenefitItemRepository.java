package za.co.thegoodneighbour.tgn.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.BenefitItem;

public interface BenefitItemRepository extends JpaRepository<BenefitItem, String> {
}
