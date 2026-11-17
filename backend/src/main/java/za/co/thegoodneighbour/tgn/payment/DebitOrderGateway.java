package za.co.thegoodneighbour.tgn.payment;

/**
 * Boundary to the payment provider for monthly debit orders.
 *
 * South African debit orders must use DebiCheck: the customer approves the mandate with their own
 * bank (in the banking app or via USSD) before any collection. Implementations talk to a licensed
 * collections provider; this application never handles bank card or account credentials itself.
 * A policy's mandate status and each collection are written only from the provider's signed
 * callbacks, never from the client app.
 */
public interface DebitOrderGateway {
    boolean isConfigured();

    /** Starts a DebiCheck mandate request for a policy. */
    MandateRequest requestMandate(String policyId, long monthlyAmountCents, int debitDay);

    record MandateRequest(State state, String providerReference) {
        public enum State { NOT_CONFIGURED, PENDING_CUSTOMER_APPROVAL }
    }
}
