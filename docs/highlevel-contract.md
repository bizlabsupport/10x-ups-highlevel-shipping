# HighLevel integration contract status

The current official Store API documents CRUD endpoints for shipping carriers and carrier-backed shipping rates. The public page for `POST /store/shipping-carrier` does not expose the request schema in its rendered reference, so the exact callback URL, authentication/header capabilities, live request payload, and live response envelope must be confirmed in the authenticated Marketplace app UI or from a captured pilot request.

The Edge Function therefore isolates HighLevel-specific translation in two functions:

- `adaptHighLevelPayload(raw)` translates the incoming cart and address.
- `highLevelRateResponse(...)` formats the outgoing rate.

Do not declare the carrier production-ready until these are validated with a real callback. The UPS integration, package expansion, pricing rules, database model, and audit logging do not depend on that final adapter shape.

