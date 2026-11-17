package za.co.thegoodneighbour.tgn.repo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import za.co.thegoodneighbour.tgn.domain.PaymentRecord;

public interface PaymentRecordRepository extends JpaRepository<PaymentRecord, String> {
    List<PaymentRecord> findByPolicyIdOrderByCreatedAtDesc(String policyId);
}
