package za.co.thegoodneighbour.tgn.api;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import za.co.thegoodneighbour.tgn.api.Dtos.*;
import za.co.thegoodneighbour.tgn.config.WebConfig;
import za.co.thegoodneighbour.tgn.domain.AppUser;
import za.co.thegoodneighbour.tgn.domain.SupportRequest;
import za.co.thegoodneighbour.tgn.repo.SupportRequestRepository;
import za.co.thegoodneighbour.tgn.service.AuthService;
import za.co.thegoodneighbour.tgn.service.CatalogService;
import za.co.thegoodneighbour.tgn.service.OrderService;

/**
 * Customer-facing API only. Administration (products, stock, prices, orders, refunds, ...) will be
 * a separate, separately-secured surface under /api/admin; none of it is exposed here.
 */
public final class Controllers {
    private Controllers() {}

    @RestController
    @RequestMapping("/api/catalog")
    public static class CatalogController {
        private final CatalogService catalog;
        public CatalogController(CatalogService catalog) { this.catalog = catalog; }

        @GetMapping
        public CatalogDto get() { return catalog.catalog(); }
    }

    @RestController
    @RequestMapping("/api/auth")
    public static class AuthController {
        private final AuthService auth;
        public AuthController(AuthService auth) { this.auth = auth; }

        @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
        public SessionDto register(@Valid @RequestBody RegisterRequest r) { return auth.register(r); }

        @PostMapping("/login")
        public SessionDto login(@Valid @RequestBody LoginRequest r) { return auth.login(r); }
    }

    @RestController
    @RequestMapping("/api/me")
    public static class MeController {
        private final AuthService auth;
        public MeController(AuthService auth) { this.auth = auth; }

        @PutMapping
        public UserDto update(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @Valid @RequestBody ProfileRequest r) {
            return auth.updateProfile(user, r);
        }
    }

    @RestController
    @RequestMapping("/api/orders")
    public static class OrderController {
        private final OrderService orders;
        public OrderController(OrderService orders) { this.orders = orders; }

        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public OrderDto place(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @Valid @RequestBody NewOrderRequest r) {
            return orders.place(user, r);
        }

        @GetMapping
        public List<OrderDto> list(@RequestAttribute(WebConfig.USER_ATTR) AppUser user) { return orders.list(user); }

        @GetMapping("/{id}")
        public OrderDto get(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @PathVariable String id) {
            return orders.get(user, id);
        }
    }

    @RestController
    @RequestMapping("/api/support-requests")
    public static class SupportController {
        private final SupportRequestRepository requests;
        public SupportController(SupportRequestRepository requests) { this.requests = requests; }

        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public void submit(@RequestAttribute(WebConfig.USER_ATTR) AppUser user, @Valid @RequestBody SupportRequestIn r) {
            requests.save(new SupportRequest(user.getId(), r.kind(), r.orderRef(), r.message().trim(), r.contactPhone()));
        }
    }
}
