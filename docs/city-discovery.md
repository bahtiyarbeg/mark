# City → places → published prices

The tickets area accepts a city, not an attraction name. `/api/places` implements three POST actions: `cities`, `places`, `prices`. No API key, paid model, fabricated fare, or booking is involved.

- Photon geocodes city names; common Russian destination names have search aliases. Ambiguous results require city selection.
- Photon category queries discover OpenStreetMap attractions, museums, theme parks, aquariums, zoos, viewpoints, parks, water parks, theatres, cinemas, arts centres and historic places. Each of three category groups is limited to 100 source results. A bounded Overpass query is a fallback. The radius is 10, 25 or 50 km; results outside the circle are filtered. The catalog cannot guarantee every venue or opening status.
- Prices resolve a selected OSM identity server-side. Known official price-page routes cover VinWonders Nha Trang and VinWonders / Safari Phu Quoc. Other venues use their OSM/Wikidata website when available. A bounded same-origin crawl inspects up to three HTML pages. Price rows retain source currency and guest categories. Amounts without an explicit currency are labeled. OSM `charge` is never presented as a verified ticket price.
- Missing websites, denied access, image/PDF-only rates, and JavaScript-only booking pages produce explicit unavailable results. No bypass of site access controls. Published amounts are not availability or a quote for a selected date.
- Geocoding/catalog cache: one hour; price cache: 15 minutes, bounded in process. Identical in-flight requests are deduplicated. Serverless cold starts reset the cache. For a larger audience, use durable caching and a dedicated provider before increasing request volume.
- External webpage requests use `publicFetch`, validating public IPs and every redirect, with a response-size limit and timeout. The client cannot submit a price-crawl URL.

Sources and usage: [Photon](https://github.com/komoot/photon), [Photon category API](https://github.com/komoot/photon/blob/master/docs/categories.md), [Overpass instance policies](https://wiki.openstreetmap.org/wiki/Overpass_API), [OSM attribution / ODbL](https://www.openstreetmap.org/copyright). Public Photon is intended for reasonable request volume and has no availability guarantee. Search runs only on button submission, never autocomplete.

Validation: `npm test`; optional actual FFmpeg render test runs when `FFMPEG_PATH` is set. Browser QA must cover city submission, city ambiguity, category filters, selected-place prices, failed-source states, audit-copy, and narrow viewport.
