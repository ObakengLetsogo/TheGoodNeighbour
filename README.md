# TGN — The Good Neighbour

*Here when it matters.*

Funeral cover for South African families, paid as a monthly subscription. The customer builds their own
cover (a grocery hamper, sheep, a cow), adds family members, pays monthly by debit order, and when someone
passes away the bundle is delivered to the family. Three independent projects live in this repo
(it is **not** a monorepo: no shared workspace tooling, each has its own dependencies and build).

```
mobile/    React Native (Expo) · TypeScript · Expo Router   iOS + Android customer app (one codebase)
admin/     React · Vite · TypeScript                        web dashboard for staff
landing/   React · Vite · TypeScript                        public website with a live price builder and waiting list
backend/   Java 21 · Spring Boot 4 · JPA · Flyway · PostgreSQL    REST API used by both (H2 in memory for local development)
```

**Strategy and operating plan:** see [`docs/STRATEGY.md`](docs/STRATEGY.md); call scripts and the quote sheet for suppliers, the payment provider and insurers are in [`docs/SUPPLIER-CALLS.md`](docs/SUPPLIER-CALLS.md) (the market, the model, margin guardrails, regulation questions for a lawyer, and the next 90 days).

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

# 4. Public website  (http://localhost:5174)
cd landing && npm install && npm run dev          # VITE_API_BASE_URL defaults to http://localhost:8080
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

The public website is a static site too: `cd landing && VITE_API_BASE_URL=https://api.example.com VITE_SITE_URL=https://www.example.com npm run build`,
then upload `dist/`. `VITE_SITE_URL` makes the WhatsApp and social share preview work. Add the site's address to
`TGN_CORS_ALLOWED_ORIGINS` on the backend, and set `VITE_SUPPORT_WHATSAPP` / `VITE_SUPPORT_PHONE` to show contact details in the footer.
The Docker files are written but have not been built or run yet.

## The database

**PostgreSQL** in production (and in `deploy/`), an in-memory **H2** database for local development and tests. The schema is
created and changed **only by Flyway migrations**: numbered SQL files in `backend/src/main/resources/db/migration`
(`V1__baseline.sql`, `V2__lookup_indexes.sql`, ...). The app starts with Hibernate in `validate` mode, so it **refuses to start**
if an entity and the migrations disagree. That also means every normal test run checks your entities against the migrations.

**To change the database** (a new column, table or index):
1. Change the entity.
2. Add the next file, e.g. `V3__add_something.sql`, with plain SQL that runs on PostgreSQL (and H2).
3. Run `mvn test`. Never edit a migration that has already run anywhere; always add a new one.

**Check it on real PostgreSQL** (the normal tests use H2). Point the opt-in test at an **empty** database:
```bash
TGN_TEST_POSTGRES_URL=jdbc:postgresql://localhost:5432/tgn_test TGN_TEST_POSTGRES_USER=tgn TGN_TEST_POSTGRES_PASSWORD=... \
  mvn test -Dtest=PostgresMigrationTest
```

**First start of a real server.** Flyway builds the whole schema on an empty database. The cover rules and catalogue are *data*, not
schema, and production does not load the placeholder ones, so until they exist `/api/cover` answers "Cover isn't available yet" (503).
Start once with `TGN_SEED_SAMPLE_COVER=true` to load the placeholder rules (only ever into an empty database), then edit every number in
the admin (Cover & Pricing). Back the database up before every release: migrations run automatically when the new version starts.

## How it works

1. **Build.** The customer picks one grocery hamper (the full grocery list is shown), 0 to 3 sheep and 0 to 2 cows. The server prices it live, and a "See how it adds up" panel shows each person's line: base × relationship % × age %.
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
| Base price | The bundle's cost to the company × **0.55%** a month (a placeholder: set it with your underwriter) |
| **Everyone's price** | **Base × relationship % × age %**, rounded once. This includes the main member |
| Relationship % | Spouse 100, child 40, parent 100, parent-in-law 100, grandparent 100, sibling 100, other family 110 |
| Age % (current age) | 0–35: 100 · 36–45: 120 · 46–55: 150 · 56–65: 200 · 66–75: 280 · 76 and over: 380 |
| Example | Bundle worth R8 200 (R5 000 hamper and a sheep), base R29.15: you at 40 pay R34.98, a spouse at 38 R34.98, a parent at 70 R81.62, a child at 9 R11.66. Total R163.24 |
| Minimum bundle | Worth at least R2 500 |
| Main member | Joins 18 to 65, cover ends at 85 |
| Joining ages | Spouse 18–65, child 0–21, parents and in-laws and grandparents 18–75, sibling and other 18–65 |
| Cover ends | Children 24, parents/in-laws/grandparents 90, others 85 (over-age claims are flagged) |
| Max family | 10 family members besides the main member (11 people in all); per relationship: 1 spouse, 6 children, 2 parents, 2 in-laws, 2 grandparents, 3 siblings, 3 other |
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

## The public website

`landing/` is the page people see before they have the app. It says plainly that TGN is **not open yet**, and its main
button is a **waiting list** (`POST /api/waitlist`: a name, a mobile number or email, and a ticked consent box; it is
rate limited to 5 sign-ups an hour per connection, silently drops bots that fill a hidden field, and answers the same
whether or not you are already on the list). Staff see the list in the admin under **Waiting List**, can export it to CSV
and can remove anyone who asks (POPIA); removals are audited.

Its **price builder** calls the same `/api/cover/quote` endpoint as the app, and the rules section and FAQ read the live
rules (`/api/cover`), so the website can never disagree with the app. Terms and Privacy are served from the same legal
documents the app shows. If the API can't be reached the page still reads fine and just hides live prices.

**Before you launch the page:** the copy says cover comes from "our farm". Make sure that is true by the time you open,
and add your insurer and registration details to the footer once they exist. Nothing on the page claims to be licensed,
underwritten or approved.

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

- **Claim documents:** the death certificate is required before staff can approve a claim (and the deceased's ID for
  anyone 16 or older). PDF, JPG or PNG only (checked by file contents, not name), 5 MB each, 10 per claim. Files are
  **encrypted at rest** on disk (`TGN_STORAGE_DIR`, a persistent volume in `deploy/`); only the customer and staff can
  read them, and each staff view is audited. Documents lock once a claim is decided.

- **Delivery planning:** once a claim is approved, staff set a delivery date, time of day (morning, afternoon or any time) and a
  note for the family. It shows in the app under "When To Expect Us", and the claim shows as delivered when staff mark it.
- **Collections (staff):** a page listing active covers that are **behind** (fewer payments received than debit dates have passed)
  and those with a debit due in the next 7 days, with the amount owed. A cover that has missed as many payments as the lapse
  rule allows is flagged, but lapsing stays a manual staff decision. Missed payments are *inferred from recorded payments*; they
  become exact once a payment provider reports failed debits.

- **Messages (in-app inbox):** customers get a plain-words message when their application is approved or declined, their cover
  starts, lapses or is cancelled, a payment is recorded, and at each step of a claim including the planned delivery date. A bell
  on the Home screen shows how many are unread, and the app checks every minute while open. Cover messages are always kept;
  payment and claim messages follow the customer's notification settings. **Nothing is sent by SMS or push yet** (that needs
  an SMS provider), so the inbox is only seen when the app is open.

- **Family plans (sharing the cost):** one person owns a plan and invites brothers, sisters or anyone else by phone number (up to 6),
  each paying a **percentage** of the monthly price; the owner pays the rest, so the shares always add up when the price changes.
  Everyone on the plan sees who has paid this month, and is told when a payment arrives. Cover starts when the payments together
  reach the monthly price, and lapses only under the normal rules, never because of one person. A contributor can change their own
  share or leave at any time, and the owner can remove them. **Privacy:** an invitation is matched by phone number and shown only
  once that number is verified; contributors see names, relationships, ages and prices, never ID numbers or anyone's phone number.
  Staff record which person paid when they log a payment. This is the foundation for the "cover your parents together" product.
  Open legal questions for a lawyer: a premium payer who is not the policyholder, and the consent of the people being covered.
- **Cover only my parents:** when applying, the owner can choose "My family only". They then pay (and invite others to share the cost)
  but are not a covered person: they aren't priced, have no age limit beyond being 18 or older, can't be claimed for, and the plan must
  cover at least one other person. The choice is fixed at application and survives later bundle and member changes.

- **Cash alternative:** on a claim the family can take the bundle (the default) or cash, and change their mind until it is settled. The
  cash amount is worked out **from what the bundle costs us** (a setting in Cover & Pricing, 100% = exactly our cost) and frozen when the
  claim is made, so cash can never cost more than delivering. It is deliberately **less than the bundle is "worth" at shop prices**, which is
  where the margin on in-kind benefits lives. **Ask your lawyer whether the cash alternative must instead equal the stated value** of the
  benefit: if it must, that margin disappears. Cost is shown only to staff; the app never shows it. Banking details are never collected in
  the app: staff call the family to arrange payment.
- **Minimum share (margin guardrail):** every person who pays costs a collection fee, so each contributor's share must be worth at least a
  set amount a month (default R50, editable in Cover & Pricing). It is checked when inviting, accepting and changing a share, and the app
  only offers shares that clear it. Set it from the payment provider's real per-collection fee.
- **Supplier prices:** staff upload the filled-in quote sheet (`docs/quote-sheet.csv`) under **Supplier Prices**. It works out the real cost of each hamper, sheep and cow
  from the lowest price for every part (prices in writing count first), flags anything missing, applies chosen costs to the catalogue (audited), and sends the payment fee and a
  typical bundle cost to the Profit Model.
- **One claim per person:** the same person can't be claimed for twice unless the earlier claim was declined (a direct protection against paying twice).
- **After a death:** when a death claim is decided (approved, or declined because it isn't payable) that person's **cover and premium end**
  from their date of death, so we never keep charging for someone who has died. Staff can tick "made in error" when declining a claim where
  nobody died, which leaves cover untouched. If the covered **main member** dies, cover for everyone else **continues for 60 days** while
  staff help a successor take over: a covered family member (who becomes the main member and is priced as one) or someone who already pays a
  share (who then pays but isn't covered). If nobody is left covered, the plan closes. The family sees a gentle message and an "in loving
  memory" list, and the plan shows in Collections until a new owner is recorded. If nobody takes over in time, staff lapse the cover as usual.

## Not built yet

- **A real payment provider** (DebiCheck mandate creation, collections, failed-payment handling, webhooks).
  Lapsing is a manual staff action until collections exist.
- An SMS provider (codes only log in development), push/SMS notifications (preferences decide what appears in the in-app inbox; nothing is sent outside the app yet).
- Staff roles beyond a single admin role, and reports and exports.
- Policy documents (claims already take uploads).
- Scheduling and tracking of livestock deliveries and herd movements (the herd is a count plus a promise limit).
- Brand photography/illustration beyond the logo mark.

## Before you sell cover (not legal advice)

Funeral plans are insurance in South Africa. Before taking money or presenting this as cover you will need, at
minimum, a licensed underwriter and the right FSCA/FAIS authorisation, policy terms and a PPR-compliant
disclosure flow (cooling-off, waiting periods, claims and lapse rules), and POPIA compliance. This software is
built so those rules are configurable and so an application is never shown as cover; it does not make you compliant.

### Checklist: before we take money or sign anyone up

This is a list of questions to take to a South African financial-services lawyer, **not legal advice**. Building, testing and
demoing the software needs none of it. Taking money, signing up customers or marketing cover does.

**Who carries the risk, and who may sell it**
- [ ] A **licensed insurer** (underwriter) signed up. Only an insurer licensed under the Insurance Act can carry funeral-cover risk.
- [ ] How cover that pays out in **groceries and livestock** is classed by the regulators (a lawyer must say), and whether a
      **microinsurance** licence or an arrangement under the insurer's licence fits.
- [ ] **Authorisation to sell and administer it**: our own FSP licence from the FSCA, or acting as a representative under a licensed FSP or the insurer.
- [ ] **Key individuals** named and passed as fit and proper, a **compliance officer**, and **professional indemnity** cover, if we hold our own licence.

**The company**
- [ ] Company registered with CIPC, and tax (SARS) compliance in order.
- [ ] Business bank account.
- [ ] **Information officer** registered with the Information Regulator (POPIA).
- [ ] Registered with the **Financial Intelligence Centre** (insurers and FSPs are covered by anti-money-laundering rules).

**Money and customers**
- [ ] A payment provider (e.g. Stitch) that has finished its checks on the business, for DebiCheck debit orders.
- [ ] Policy terms, Privacy Notice and Key Facts **approved by a lawyer** (they are drafts now), and the disclosure and cooling-off flow checked against the policyholder protection rules.
- [ ] The **website reviewed by a lawyer** before it goes public: marketing a financial product can have its own rules, even before anything is sold.
- [ ] Claims, complaints and lapse procedures written down.

**Documents funders and partners will ask for**
CIPC registration certificate · tax compliance status · signed agreement with the underwriter · FSP licence number or representative arrangement ·
proof of professional indemnity cover · information officer registration · bank confirmation letter · the payment provider's approval.

**If you work for a bank or another financial business:** read your employment contract, code of ethics and outside-interests policy first,
and declare in writing before registering or taking money. The FSCA register of FSPs and key individuals is public.

## History

**The Terms of Use and Privacy Notice are placeholder drafts**, labelled as drafts to customers. Replace them in the admin
dashboard (Terms & Privacy) with lawyer-approved text, then untick Draft. Key Facts is generated from the live rules.

Commits before "Pivot backend…" describe an earlier one-off provisions shop (food and livestock delivery). That
code was removed when the product became funeral plans; it remains in git history.
