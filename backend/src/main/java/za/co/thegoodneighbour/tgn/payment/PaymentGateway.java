package za.co.thegoodneighbour.tgn.payment;

/**
 * Backend counterpart of the mobile PaymentProvider abstraction. A real implementation (PayFast,
 * Ozow, Peach Payments, Stitch, ...) creates a payment session and, from a signed provider webhook,
 * moves the order to "payment_confirmed". Orders are only ever marked paid from that webhook.
 */
public interface PaymentGateway {
    boolean isConfigured();

    /** Starts a payment for an order. */
    PaymentSession start(String orderId, long amountCents, String method);

    record PaymentSession(State state, String redirectUrl, String reference) {
        public enum State { NOT_CONFIGURED, REDIRECT, PENDING }
    }
}
