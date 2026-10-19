# GET AI Marketing — AI Auto Registration Agent

Goal: maximize automated onboarding of licensed GetTravel Vietnam as a tour/activity supplier on eligible international marketplaces and advertising channels, without connecting CRM.

## Workflow
1. Ingest verified channel opportunities from Global Market Scout.
2. Check official seller eligibility, Vietnam support, required documentation, costs and contractual terms; retain source links and checked dates.
3. Translate onboarding UI and questions; prepare application fields from a user-approved company profile and approved documents.
4. Navigate permitted registration forms via authorized browser automation; prefill and save drafts when possible.
5. Require explicit user approval before submitting applications, accepting contractual terms, signing, granting access, or making any payment. Never fabricate business details or represent the user in identity verification.
6. Stop and request user input for CAPTCHA, SMS/2FA, identity checks, legal signature, or blocked registrations; never bypass anti-bot restrictions or platform policies.
7. Track application states (discovered, eligible, draft, awaiting approval, submitted, verification needed, approved, rejected) with evidence and audit logs; avoid duplicate submissions.
8. Notify the user only for necessary interventions and meaningful outcomes.

## Security
- Keep passwords, banking data, IDs and documents out of GitHub and frontend localStorage. Use a secure encrypted credential/document vault and least-privilege access.
- No unattended payments, terms acceptance, or submission without explicit authorization.
- Respect platform terms, rate limits and automation policies; prefer official partner APIs and supported browser workflows.
- All externally visible actions logged; user can pause or revoke agent.

## Acceptance criteria
- Can prepare multilingual application drafts from verified profile.
- Can flag required human steps clearly.
- No external submission without approval.
- Clear eligibility reasons and no false claims of successful registration.
- Tracks status and avoids duplicate applications.

Implementation status: specification only; automation and integrations still need to be built and tested.
