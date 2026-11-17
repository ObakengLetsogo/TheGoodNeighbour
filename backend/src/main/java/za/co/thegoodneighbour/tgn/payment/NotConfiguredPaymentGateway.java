package za.co.thegoodneighbour.tgn.payment;

import org.springframework.stereotype.Component;

@Component
public class NotConfiguredPaymentGateway implements PaymentGateway {
    @Override
    public boolean isConfigured() { return false; }

    @Override
    public PaymentSession start(String orderId, long amountCents, String method) {
        return new PaymentSession(PaymentSession.State.NOT_CONFIGURED, null, null);
    }
}
