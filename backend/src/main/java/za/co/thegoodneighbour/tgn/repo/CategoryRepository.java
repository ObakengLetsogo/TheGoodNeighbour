package za.co.thegoodneighbour.tgn.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.Category;

public interface CategoryRepository extends JpaRepository<Category, String> {

}
