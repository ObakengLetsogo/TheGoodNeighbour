package za.co.thegoodneighbour.tgn.payment;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "tgn.sms-mode", havingValue = "disabled")
public class DisabledSmsGateway implements SmsGateway {
    @Override public boolean isEnabled() { return false; }
    @Override public void send(String toE164, String message) { throw new IllegalStateException("SMS is not configured."); }
}
