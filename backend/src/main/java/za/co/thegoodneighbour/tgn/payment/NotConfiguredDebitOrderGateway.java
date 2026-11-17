package za.co.thegoodneighbour.tgn.payment;

import org.springframework.stereotype.Component;

@Component
public class NotConfiguredDebitOrderGateway implements DebitOrderGateway {
    @Override public boolean isConfigured() { return false; }

    @Override
    public MandateRequest requestMandate(String policyId, long monthlyAmountCents, int debitDay) {
        return new MandateRequest(MandateRequest.State.NOT_CONFIGURED, null);
    }
}
