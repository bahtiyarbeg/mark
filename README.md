# GET AI Marketing

Standalone AI marketing system for GetTravel. This project is intentionally independent from the GetTravel CRM.

## MVP goals

1. Competitor intelligence for Nha Trang / Cam Ranh tourism.
2. Content planning and multilingual post generation.
3. Image brief/prompt generation for branded creatives.
4. Human approval before publishing in the first release.
5. Later: official social APIs, analytics feedback loop, video and B2B modules.

## Architecture

- `app/agents/director.py` — orchestrates the daily marketing workflow.
- `app/agents/competitor.py` — normalizes and scores competitor observations.
- `app/agents/content.py` — builds original platform-specific content briefs.
- `app/agents/image.py` — creates GetTravel visual briefs/prompts.
- `app/models.py` — shared data models.
- `app/main.py` — runnable MVP demo.

## Guardrails

- Never invent tour prices. If no verified price exists, use `Price on request for your travel date`.
- Do not copy competitor wording; extract topics, formats and market signals, then create original GetTravel content.
- Do not include visa services.
- Publishing adapters must use official/supported platform APIs where available.
- First release keeps a human approval gate before publication.

## Run locally

```bash
python -m app.main
```

No paid API is required for this first skeleton. The next step is to connect permitted data sources and an AI provider behind replaceable adapters.
