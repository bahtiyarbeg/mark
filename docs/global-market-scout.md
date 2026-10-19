# GET AI Marketing — Global Market Scout

## Goal
Continuously discover, evaluate, and rank worldwide channels where GetTravel can advertise or sell Vietnam excursions, regardless of platform language or brand familiarity. Independent of CRM.

## Coverage
- Activity marketplaces, OTAs, super-apps, local travel apps, B2B distributors, affiliate networks, search engines, social communities, hotel concierge channels, and regional advertising networks.
- Discover in Russian, English, Vietnamese, Korean, Chinese (simplified/traditional), Turkish, Japanese, Thai, Indonesian, Malay, Mongolian, French and additional relevant languages.
- Prioritize inbound visitors to Nha Trang, Cam Ranh, Dalat, Phan Rang and Vietnam.

## Automated pipeline
1. Discover candidates via permitted search/index and official directory APIs, translated multilingual queries, regional app stores, tourism directories and public sources.
2. Deduplicate platforms and identify official website, app, countries, languages, channel type, and provider onboarding URL.
3. Verify whether Vietnam tours/activities are supported; whether local licensed operators may register; commission, fees, listing requirements, payout conditions, API availability, and whether paid advertising is offered.
4. Assess traffic/market reach using attributed sources, date, geographic relevance, reviews and demand signals. Mark unknown or estimated values clearly; never fabricate traffic, conversion or revenue.
5. Score by Vietnam tourism relevance, likely booking intent, reachable audience, feasibility, cost, and source confidence; preserve evidence and last-checked timestamp.
6. Queue recommendations for review; refresh high-value channels regularly and alert on new opportunities or changed terms.

## Dashboard requirements
- New top-level menu: `04 · Global Market Scout / Рекламные площадки`.
- Filters: source market, language, channel category, free/paid, direct-booking availability, partner registration, verified status.
- Fields: name, region, URL, app, category, audience/traffic estimate with evidence, activity relevance, operator eligibility, commission/fee, contact/onboarding link, score, status, last checked.
- Actions: open official onboarding page, save shortlist, compare, export CSV, mark applied/approved. No automated signups, payments or publication without explicit authorization.
- States: discovered → evidence pending → verified → shortlisted → applied → active/rejected.

## Implementation boundaries
- Use permitted public information and official APIs; honor platform terms and access controls. No private-account scraping or bypassing rate limits.
- A platform's popularity does not imply tour-booking demand. State evidence limitations.
- Keep competitor and channel discovery distinct; channel scout finds new acquisition/distribution opportunities.
- Separate adapters for discovery sources, translation, enrichment, scoring, persistence and scheduled jobs. Use low-cost/free tiers where feasible, with quotas and backoff.
- Do not connect to GetTravel CRM.

## Acceptance tests
- Multi-language discovery and deduplication.
- No unverified numeric traffic claims.
- Ranking explains score and source confidence.
- No platform is labelled bookable without confirmed seller eligibility.
- Sources and timestamps retained for audit.
