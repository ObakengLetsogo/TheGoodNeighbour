package za.co.thegoodneighbour.tgn.repo;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.OtpCode;

public interface OtpCodeRepository extends JpaRepository<OtpCode, String> {
    long countByPhoneAndPurposeAndCreatedAtAfter(String phone, String purpose, Instant after);
    Optional<OtpCode> findFirstByPhoneAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(String phone, String purpose);
}
