package za.co.thegoodneighbour.tgn.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import za.co.thegoodneighbour.tgn.service.ApiException;
import za.co.thegoodneighbour.tgn.service.AuthService;
import za.co.thegoodneighbour.tgn.service.StaffAuthService;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    public static final String USER_ATTR = "tgn.user";
    public static final String STAFF_ATTR = "tgn.staff";

    private final TgnProperties props;
    private final AuthService auth;
    private final StaffAuthService staffAuth;

    public WebConfig(TgnProperties props, AuthService auth, StaffAuthService staffAuth) {
        this.props = props; this.auth = auth; this.staffAuth = staffAuth;
    }

    /** South African time: dates such as "today" and debit days are evaluated in SAST. */
    @Bean
    Clock clock() { return Clock.system(ZoneId.of("Africa/Johannesburg")); }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(props.corsAllowedOrigins().toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type");
    }

    /**
     * Customer endpoints need a customer bearer token; /api/admin/** needs a staff token. The two
     * token kinds are not interchangeable. Plans and sign-in endpoints are public.
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
                if ("OPTIONS".equals(req.getMethod())) return true;
                var user = bearer(req).flatMap(auth::authenticate)
                        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in to continue."));
                req.setAttribute(USER_ATTR, user);
                return true;
            }
        }).addPathPatterns("/api/policies/**", "/api/claims/**", "/api/me", "/api/support-requests");

        registry.addInterceptor(new HandlerInterceptor() {
            @Override public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
                if ("OPTIONS".equals(req.getMethod())) return true;
                var staff = bearer(req).flatMap(staffAuth::authenticate)
                        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in to continue."));
                req.setAttribute(STAFF_ATTR, staff);
                return true;
            }
        }).addPathPatterns("/api/admin/**").excludePathPatterns("/api/admin/auth/login");
    }

    private static java.util.Optional<String> bearer(HttpServletRequest req) {
        String h = req.getHeader("Authorization");
        return h != null && h.startsWith("Bearer ") ? java.util.Optional.of(h.substring(7).trim()) : java.util.Optional.empty();
    }
}
