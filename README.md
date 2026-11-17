# TGN — The Good Neighbour

*Here when it matters.*

Funeral plans for South African families: choose a plan, add family members for a small monthly fee each,
pay monthly by debit order, and claim when it matters. Three independent projects live in this repo
(it is **not** a monorepo: no shared workspace tooling, each has its own dependencies and build).

```
mobile/    React Native (Expo) · TypeScript · Expo Router   iOS + Android customer app (one codebase)
admin/     React · Vite · TypeScript                        web dashboard for staff
backend/   Java 21 · Spring Boot 4 · JPA · PostgreSQL/H2    REST API used by both
```

## Run it

```bash
# 1. Backend  (http://localhost:8080, in-memory H2, sample plans seeded)
cd backend
TGN_BOOTSTRAP_ADMIN_EMAIL=you@example.com TGN_BOOTSTRAP_ADMIN_PASSWORD='at-least-12-characters' mvn spring-boot:run
mvn test

# 2. Customer app  (iOS / Android / web)
cd mobile && npm install && npx expo start        # EXPO_PUBLIC_API_BASE_URL defaults to http://localhost:8080

# 3. Admin dashboard  (http://localhost:5173)
cd admin && npm install && npm run dev            # VITE_API_BASE_URL defaults to http://localhost:8080
```

On a physical phone, set `EXPO_PUBLIC_API_BASE_URL` to your computer's LAN address. Environment variables are
listed in `mobile/.env.example`, `admin/.env.example` and `backend/src/main/resources/application.yml`.

## How a plan works

1. A customer applies (ID number, debit date, family members). The server prices it and stores it as **pending review**.
2. Staff review it in the admin dashboard and **approve** or **decline** it (a reason is required to decline).
3. Cover becomes **active only when a first payment covering the monthly total is recorded**, by the payment provider
   integration or by staff recording money that really arrived. The waiting period starts then.
4. Family members can be added or removed (each with a fee, age limits and a per-person waiting period).
5. Claims are submitted in the app and worked through submitted → under review → approved → paid by staff.
   Claims inside a waiting period are flagged.

Plans, premiums, family-member fees, cover, age limits and waiting periods are **data**, edited in the admin
dashboard (audited), never hard-coded. **All sample numbers are placeholders**: real pricing and rules must
come from your underwriter.

## Security and payments

- **We never touch card or bank credentials.** Monthly collection goes through a payment provider (DebiCheck
  debit orders). The seam is `DebitOrderGateway` (backend) and `policyService.setUpDebitOrder` (app). **No provider is
  connected yet**, so nothing is collected, and the app says so plainly. Payments and mandates are only ever written
  from the provider's signed confirmation or an audited staff entry, never from the client.
- ID numbers are **encrypted at rest** (AES-256-GCM, per-value IV) and masked in the customer app. Staff see them in full;
  opening a policy is written to the audit log. Production refuses to start without `TGN_PII_KEY`.
- Passwords are BCrypt-hashed. Bearer tokens are random and stored hashed. Customer and staff tokens are not
  interchangeable, and each customer can only read their own plans and claims.
- Staff actions on policies, payments, claims and plans are written to an append-only audit log.

## Not built yet

- **A real payment provider** (DebiCheck mandate creation, collections, failed-payment handling, webhooks).
  Lapsing is a manual staff action until collections exist.
- Database migrations (Flyway/Liquibase), staff roles beyond a single admin role, SMS/OTP login, push notifications.
- Document uploads for claims, beneficiaries, and policy documents.
- Brand photography/illustration beyond the logo mark.

## Before you sell cover (not legal advice)

Funeral plans are insurance in South Africa. Before taking money or presenting this as cover you will need, at
minimum, a licensed underwriter and the right FSCA/FAIS authorisation, policy terms and a PPR-compliant
disclosure flow (cooling-off, waiting periods, claims and lapse rules), and POPIA compliance. This software is
built so those rules are configurable and so an application is never shown as cover; it does not make you compliant.

## History

Commits before "Pivot backend…" describe an earlier one-off provisions shop (food and livestock delivery). That
code was removed when the product became funeral plans; it remains in git history.
