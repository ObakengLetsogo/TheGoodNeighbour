package za.co.thegoodneighbour.tgn.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.AppUser;

public interface AppUserRepository extends JpaRepository<AppUser, String> {
    java.util.Optional<AppUser> findByPhone(String phone);
}
