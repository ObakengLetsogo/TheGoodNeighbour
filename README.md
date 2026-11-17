# TGN — The Good Neighbour

*Here when it matters.*

A South African platform that makes it easier for families to organise, buy and arrange delivery of
essential supplies for important occasions. Funeral provisions are the first use case; the data model
is occasion-agnostic (products and services never depend on an occasion type).

```
mobile/    Expo · React Native · TypeScript · Expo Router   (customer app)
backend/   Java 21 · Spring Boot 4 · JPA · PostgreSQL/H2    (REST API)
```

## Run it

**Mobile (works on its own, with bundled mock services):**

```bash
cd mobile
npm install
npx expo start          # press i / a / w
```

**Backend:**

```bash
cd backend
mvn spring-boot:run     # http://localhost:8080, in-memory H2, sample catalogue seeded
mvn test
```

**Mobile against the backend:** set `EXPO_PUBLIC_API_BASE_URL=http://localhost:8080` (see
`mobile/.env.example`) and restart Expo. Use your machine's LAN IP on a physical device. With the variable
unset, the app uses the mock services in `mobile/src/services/mock.ts`.

Production: `SPRING_PROFILES_ACTIVE=prod` with `TGN_DB_URL`, `TGN_DB_USER`, `TGN_DB_PASSWORD`,
`TGN_CORS_ALLOWED_ORIGINS`. The sample catalogue is not seeded in prod.

## Architecture

| Concern | Where |
|---|---|
| Design tokens (colour, type, spacing, radii, shadows, component sizes) | `mobile/src/theme/index.ts` |
| Typed API contracts | `mobile/src/types/index.ts` ↔ `backend/.../api/Dtos.java` |
| Service interfaces (catalogue, orders, auth, support, **payments**) | `mobile/src/services/contracts.ts` |
| Mock vs HTTP implementations, chosen in one place | `mobile/src/services/index.ts` |
| Pure business logic (pricing, catalogue queries) | `mobile/src/lib/` |
| State (basket, auth, catalogue, orders) | `mobile/src/store/` |
| Reusable UI (Card with folder tab, Button, Input, states…) | `mobile/src/components/` |

- **Money** is integer cents (ZAR), formatted as `R1 500` with non-breaking spaces (`lib/format.ts`).
- **Pricing is verified server-side.** The client shows live totals; the backend re-prices every order from the
  catalogue and ignores client prices.
- **Payments** go through a `PaymentProvider` interface (mobile) / `PaymentGateway` (backend). Neither is
  connected to a provider yet, so orders are saved as `order_received` / `awaiting_payment` and the app never
  claims a payment. Orders become paid only from a provider-confirmed signal.
- **Order status** is never advanced by the customer app. Operations/admin (future) own status changes.
- Livestock preparation (slaughter & dressing) is a separate, optional service per product, never assumed.

## Not built yet (by design)

- Admin dashboard (products, stock, prices, delivery fees, suppliers, promotions, refunds, order status).
  The backend schema is shaped for it; no admin endpoints are exposed to customers.
- A real payment provider, payment webhooks, and refunds.
- Product photography: `imageUrl` is supported end to end; until supplied, tiles show an illustrated placeholder.
- Support requests go to the API when configured; WhatsApp and call numbers come from
  `EXPO_PUBLIC_SUPPORT_WHATSAPP` / `EXPO_PUBLIC_SUPPORT_PHONE`.
- Database migrations (Flyway/Liquibase), SMS/OTP login, push notifications, real delivery-fee rules.

## Sample data

Prices, stock, serving guides ("Around 60 people"), package discounts and delivery fees in
`mobile/src/data/mockCatalog.ts` (and the backend seed copy in `backend/src/main/resources/seed/catalog.json`)
are **placeholders**, not supplier quotes or commitments.
