package za.co.thegoodneighbour.tgn.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.HandlerInterceptor;
import za.co.thegoodneighbour.tgn.domain.AppUser;
import za.co.thegoodneighbour.tgn.service.ApiException;
import za.co.thegoodneighbour.tgn.service.AuthService;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    public static final String USER_ATTR = "tgn.user";

    private final TgnProperties props;
    private final AuthService auth;

    public WebConfig(TgnProperties props, AuthService auth) {
        this.props = props; this.auth = auth;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(props.corsAllowedOrigins().toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type");
    }

    /** Customer endpoints require a bearer token. Catalogue and auth endpoints are public. */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
                if ("OPTIONS".equals(req.getMethod())) return true;
                String header = req.getHeader("Authorization");
                AppUser user = header != null && header.startsWith("Bearer ")
                        ? auth.authenticate(header.substring(7).trim()).orElse(null) : null;
                if (user == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in to continue.");
                req.setAttribute(USER_ATTR, user);
                return true;
            }
        }).addPathPatterns("/api/orders/**", "/api/me", "/api/support-requests");
    }
}
