package za.co.thegoodneighbour.tgn.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "tgn")
public record TgnProperties(List<String> corsAllowedOrigins, boolean seedSampleCatalog) {
    public TgnProperties {
        corsAllowedOrigins = corsAllowedOrigins == null ? List.of() : corsAllowedOrigins;
    }
}
