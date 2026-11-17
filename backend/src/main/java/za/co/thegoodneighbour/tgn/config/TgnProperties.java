package za.co.thegoodneighbour.tgn.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param piiKey base64 AES-256 key used to encrypt ID numbers at rest. Required in production.
 * @param bootstrapAdminEmail/Password create the first staff account when no staff exist.
 * @param seedBaseRateBps the monthly rate (basis points of bundle cost) used when seeding the sample cover rules. A PLACEHOLDER.
 * @param storageDir where uploaded claim documents are kept (encrypted). Mount a persistent volume here in production.
 * @param smsMode log (development: codes go to the server log) or disabled (production until an SMS provider is connected).
 */
@ConfigurationProperties(prefix = "tgn")
public record TgnProperties(List<String> corsAllowedOrigins, boolean seedSampleCover, String piiKey,
                            String bootstrapAdminEmail, String bootstrapAdminPassword, String smsMode,
                            Integer seedBaseRateBps, String storageDir) {
    public TgnProperties {
        corsAllowedOrigins = corsAllowedOrigins == null ? List.of() : corsAllowedOrigins;
    }
}
