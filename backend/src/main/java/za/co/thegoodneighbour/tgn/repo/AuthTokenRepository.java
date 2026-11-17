package za.co.thegoodneighbour.tgn.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import za.co.thegoodneighbour.tgn.domain.AuthToken;

public interface AuthTokenRepository extends JpaRepository<AuthToken, String> {
    /** Signs the customer out everywhere. */
    @Modifying @Query("delete from AuthToken t where t.userId = :userId and t.staff = false")
    void deleteCustomerTokens(@org.springframework.data.repository.query.Param("userId") String userId);

}
