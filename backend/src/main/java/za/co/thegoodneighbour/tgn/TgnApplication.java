package za.co.thegoodneighbour.tgn;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class TgnApplication {
    public static void main(String[] args) {
        SpringApplication.run(TgnApplication.class, args);
    }
}
