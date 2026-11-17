package za.co.thegoodneighbour.tgn.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.AuthToken;

public interface AuthTokenRepository extends JpaRepository<AuthToken, String> {

}
