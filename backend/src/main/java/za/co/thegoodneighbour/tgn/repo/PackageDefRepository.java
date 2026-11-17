package za.co.thegoodneighbour.tgn.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.PackageDef;

public interface PackageDefRepository extends JpaRepository<PackageDef, String> {

}
