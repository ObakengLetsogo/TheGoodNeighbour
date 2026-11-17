package za.co.thegoodneighbour.tgn.payment;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** DEVELOPMENT ONLY: "sends" an SMS by writing it to the server log and remembering it, so codes can be read in tests and demos. */
@Component
@ConditionalOnProperty(name = "tgn.sms-mode", havingValue = "log", matchIfMissing = true)
public class LoggingSmsGateway implements SmsGateway {
    private static final Logger log = LoggerFactory.getLogger(LoggingSmsGateway.class);
    private final Map<String, String> last = new ConcurrentHashMap<>();

    @Override public boolean isEnabled() { return true; }

    @Override
    public void send(String toE164, String message) {
        last.put(toE164, message);
        log.warn("DEV SMS to {}: {}", toE164, message);
    }

    /** The most recent message sent to a number (tests and local demos only). */
    public String lastMessageTo(String toE164) { return last.get(toE164); }
}
