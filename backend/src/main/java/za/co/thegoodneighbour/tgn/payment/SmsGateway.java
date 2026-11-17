package za.co.thegoodneighbour.tgn.payment;

/**
 * Boundary to an SMS provider (BulkSMS, Clickatell, Twilio, ...) for one-time codes. In development the
 * LoggingSmsGateway prints the message to the server log instead of sending it. In production it is
 * "disabled" until a provider is connected, and the apps explain that SMS isn't switched on.
 */
public interface SmsGateway {
    /** Whether codes can actually be delivered. When false, phone verification is skipped and password reset by SMS is unavailable. */
    boolean isEnabled();

    void send(String toE164, String message);
}
