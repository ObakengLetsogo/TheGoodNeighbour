# Notes for the lawyer: draft Terms and Privacy Notice

The two draft documents are in `backend/src/main/resources/legal/` (`terms.md` and `privacy.md`). They are loaded into the app as **drafts**, so customers see a "still being finalised" notice. Square brackets `[like this]` are things to be filled in. They are written to match what the software actually does today, so the main question is what must change, not what to write from nothing.

## What to ask the lawyer to do
1. **Review, don't rewrite.** Mark up what is wrong, missing or risky. Agree a fee for a review, not for fresh drafting.
2. **Fill the structure in last.** Section 1 (who provides the cover), section 2 (in kind or cash), section 8 (the cash alternative) and section 16 (ombud) depend on the answer to the licensing question. Do these after you have it.
3. **The Privacy Notice does not depend on that answer.** It can be reviewed now.

## Points in the Terms the lawyer should look at
- **Section 2 and 8:** Is a benefit "in kind" allowed? What must the cash alternative equal? (Our rule today: cash is fixed at what the bundle costs us, one claim per person.)
- **Section 1:** The licence or representative position, and the exact wording required by FAIS, the Policyholder Protection Rules and the Consumer Protection Act (cooling-off, plain language, disclosures).
- **Section 5 and 9:** Waiting periods, lapse and reinstatement numbers. These are set in the admin (Cover page); fix them with the insurer.
- **Section 7:** Several people paying one plan. Is the payer the same as the policyholder? What consent is needed from the people covered? Who is liable for unpaid shares?
- **Section 10:** After the policyholder dies: the plan continues for 60 days and can be taken over. Is that a permitted way to continue cover?
- **Section 6:** Annual price review, capped. Is the notice period right?
- **Section 11:** Funeral wishes: any issue storing them or showing them to the paying family members?

## Points in the Privacy Notice
- Name the **information officer** and register them with the Information Regulator.
- Retention periods (section 7): the number of years we must keep financial and claims records.
- **Children's information** (section 9): the consent wording for a parent or guardian.
- **Special personal information:** funeral wishes can reveal religion; a cause of death is health-related. Check the lawful basis for each.
- **Operators and transfers:** if the SMS or payment provider, or the server, is outside South Africa (POPIA section 72).
- **Breach notice:** the wording about telling the Information Regulator.

## What the software does that the documents rely on
- ID numbers are encrypted at rest; uploaded claim documents are encrypted at rest.
- Passwords are hashed; five wrong tries lock sign-in for 15 minutes (customers and staff).
- Contributors never see anyone's ID or mobile number.
- Account deletion is immediate with no plan or claim, otherwise a staff-reviewed request.
- Staff actions are logged in an audit trail.
- The version of the Terms and Privacy Notice a person accepted is recorded.
