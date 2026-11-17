# TGN — The Good Neighbour

*Here when it matters.*

Funeral cover for South African families, paid as a monthly subscription. The customer builds their own
cover (a grocery hamper, sheep, a cow), adds family members, pays monthly by debit order, and when someone
passes away the bundle is delivered to the family. Three independent projects live in this repo
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

## Put it on a phone

You need a free [Expo](https://expo.dev) account. iPhone installs also need an Apple Developer account (R2 000 a year);
Android needs nothing for test builds.

1. **Host the API** over https (see below), so the phone can reach it. A phone can't use `localhost`.
2. Install the tool and sign in: `npm i -g eas-cli && eas login`, then in `mobile/` run `eas init`.
3. Tell the build where the API is: `eas env:create --name EXPO_PUBLIC_API_BASE_URL --value https://api.example.com --environment preview --visibility plaintext`
   (repeat for `production`). Builds **refuse to run** without an https address, so a test app can't point at localhost by mistake.
4. Build a test app:
   - Android: `eas build --profile preview --platform android` gives an APK you open on the phone from the link.
   - iPhone: `eas build --profile preview --platform ios`, then `eas submit --platform ios` to put it on TestFlight.
5. Faster for a quick look: run the API on your computer and the app in **Expo Go** with `EXPO_PUBLIC_API_BASE_URL=http://YOUR-LAN-IP:8080 npx expo start`.

Before the first store submission, confirm the app identifier `za.co.thegoodneighbour.tgn` in `mobile/app.config.ts`. It is permanent once published.

## Host the API (one small server)

On any Linux server with Docker, and a domain name pointing at it:

```bash
cd deploy && cp .env.example .env     # fill it in; generate TGN_PII_KEY with: openssl rand -base64 32
docker compose up -d --build          # PostgreSQL + the API + automatic HTTPS
```

For a **demo** server set `TGN_SEED_SAMPLE_COVER=true` and `TGN_SMS_MODE=log` (SMS codes then appear in
`docker compose logs backend`). Back up the database and keep `TGN_PII_KEY` safe: ID numbers can't be read without it.
Host the admin dashboard (`cd admin && VITE_API_BASE_URL=https://api.example.com npm run build`, upload `dist/`) on any static host.
The Docker files are written but have not been built or run yet.

## How it works

1. **Build.** The customer picks one grocery hamper (the full grocery list is shown), 0 to 3 sheep and 0 to 2 cows. The server prices it live.
2. **Apply.** ID number, debit date and family members. Every member needs a **relationship** to the main member
   (spouse, child, parent, parent-in-law, grandparent, sibling, other) and an **ID number** (optional for under 16s).
3. **Review.** Staff approve or decline (a reason is required to decline).
4. **Cover starts** only when a first payment covering the monthly total is recorded, by the payment provider
   integration or by staff recording money that really arrived. Never from the app.
5. **Claim.** The family submits cause of death and delivery details. Staff work it: submitted, under review, approved, provisions delivered.

### Business rules (current defaults)

Every number below is **data** edited in the admin dashboard (Cover & Pricing), audited, and is a **placeholder
until your underwriter signs it off**.

| Rule | Default |
|---|---|
| One bundle per death | The bundle in force is delivered, whoever on the cover passes away |
| Monthly price (main member) | Bundle cost to the company × **1.6%** |
| Family member fee | Main member's price × relationship %: spouse 100, child 40, parent 150, parent-in-law 150, grandparent 180, sibling 110, other 130 |
| Minimum bundle | Worth at least R2 500 |
| Main member | Joins 18 to 65, cover ends at 85 |
| Joining ages | Spouse 18–65, child 0–21, parents and in-laws and grandparents 18–75, sibling and other 18–65 |
| Cover ends | Children 24, parents/in-laws/grandparents 90, others 85 (over-age claims are flagged) |
| Max family | 10 people; per relationship: 1 spouse, 6 children, 2 parents, 2 in-laws, 2 grandparents, 3 siblings, 3 other |
| ID number | Required from age 16; checked (Luhn and date of birth), unique on the cover |
| Waiting period | 180 days natural causes; none for accidents; people added later get their own 180 days |
| Upgrade | The increase only pays out after 180 days; the earlier bundle stays payable meanwhile (accidents: immediate) |
| Downgrade | Applies immediately |
| Missed payments | Lapses after 2 missed (staff action until collections exist); reinstate within 90 days by a recorded payment, keeping the waiting periods. After that, apply again |
| Cancelling | Before cover starts: withdraw instantly. After: a request that staff confirm (date, money owed or due back). The customer can change their mind first |
| Cooling-off | Cancellations in the first 31 days are flagged to staff as possibly refundable. **Confirm the figure and the refund rule with your underwriter** |
| Yearly increase | Reviewed yearly, capped at 10%, with notice |
| Livestock | From your own farm. A herd guard stops selling more animal promises than **herd size × 25**, so a bundle that can't be honoured is never offered |
| Preparation | Slaughter and dressing is separate and not included |

## Security and payments

- **We never touch card or bank credentials.** Monthly collection goes through a payment provider (DebiCheck
  debit orders). The seam is `DebitOrderGateway` (backend) and `policyService.setUpDebitOrder` (app). **No provider is
  connected yet**, so nothing is collected, and the app says so plainly. Payments and mandates are only ever written
  from the provider's signed confirmation or an audited staff entry, never from the client.
- ID numbers are **encrypted at rest** (AES-256-GCM, per-value IV) and masked in the customer app. Staff see them in full;
  opening a policy is written to the audit log. Production refuses to start without `TGN_PII_KEY`.
- Passwords are BCrypt-hashed. Bearer tokens are random and stored hashed. Customer and staff tokens are not
  interchangeable, and each customer can only read their own plans and claims.
- Staff actions on policies, payments, claims, plans, legal text and support are written to an append-only audit log.
- **SMS codes** (6 digits, 10 minutes, 3 sent an hour, 5 attempts each, stored hashed) are used to verify a customer's
  number, reset a forgotten password and change the number. They go through an `SmsGateway`. In development
  (`TGN_SMS_MODE=log`, the default) the code is written to the **server log**; in production it is `disabled` until an SMS
  provider is connected, and the apps say so. No provider is connected yet.
- Five wrong passwords lock an account for 15 minutes. Changing or resetting a password signs every other device out.
  Password reset requests answer identically whether or not the number has an account.
- **POPIA:** customers can delete their account in the app. With no cover or claims on file it is immediate; otherwise it
  becomes a request in the staff Support Inbox. Acceptance of the Terms and Privacy Notice is recorded with the version.

## Not built yet

- **A real payment provider** (DebiCheck mandate creation, collections, failed-payment handling, webhooks).
  Lapsing is a manual staff action until collections exist.
- An SMS provider (codes only log in development), push/SMS notifications (preferences are saved but nothing is sent yet).
- Database migrations (Flyway/Liquibase), staff roles beyond a single admin role.
- Document uploads for claims, and policy documents.
- Scheduling and tracking of livestock deliveries and herd movements (the herd is a count plus a promise limit).
- Brand photography/illustration beyond the logo mark.

## Before you sell cover (not legal advice)

Funeral plans are insurance in South Africa. Before taking money or presenting this as cover you will need, at
minimum, a licensed underwriter and the right FSCA/FAIS authorisation, policy terms and a PPR-compliant
disclosure flow (cooling-off, waiting periods, claims and lapse rules), and POPIA compliance. This software is
built so those rules are configurable and so an application is never shown as cover; it does not make you compliant.

## History

**The Terms of Use and Privacy Notice are placeholder drafts**, labelled as drafts to customers. Replace them in the admin
dashboard (Terms & Privacy) with lawyer-approved text, then untick Draft. Key Facts is generated from the live rules.

Commits before "Pivot backend…" describe an earlier one-off provisions shop (food and livestock delivery). That
code was removed when the product became funeral plans; it remains in git history.
