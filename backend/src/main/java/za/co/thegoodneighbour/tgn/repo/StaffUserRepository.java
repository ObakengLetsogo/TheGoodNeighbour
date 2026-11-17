package za.co.thegoodneighbour.tgn.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.StaffUser;

public interface StaffUserRepository extends JpaRepository<StaffUser, String> {
    Optional<StaffUser> findByEmail(String email);
}
