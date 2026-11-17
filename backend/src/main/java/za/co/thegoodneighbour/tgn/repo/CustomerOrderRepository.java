package za.co.thegoodneighbour.tgn.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.CustomerOrder;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, String> {
    List<CustomerOrder> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<CustomerOrder> findByIdAndUserId(String id, String userId);
}
