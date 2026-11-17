package za.co.thegoodneighbour.tgn.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param piiKey base64 AES-256 key used to encrypt ID numbers at rest. Required in production.
 * @param bootstrapAdminEmail/Password create the first staff account when no staff exist.
 */
@ConfigurationProperties(prefix = "tgn")
public record TgnProperties(List<String> corsAllowedOrigins, boolean seedSamplePlans, String piiKey,
                            String bootstrapAdminEmail, String bootstrapAdminPassword) {
    public TgnProperties {
        corsAllowedOrigins = corsAllowedOrigins == null ? List.of() : corsAllowedOrigins;
    }
}
