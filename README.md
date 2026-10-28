# Agripredict

A mobile-first climate-risk assistant for Moroccan farmers, built with Next.js, TypeScript, Tailwind, Zod, Recharts and Google GenAI. No authentication or database.

## Run locally

```sh
pnpm install
cp .env.example .env.local
# Add GOOGLE_API_KEY to .env.local to enable Gemma advice.
pnpm dev
```

Open http://localhost:3000. Use Farm settings to enter a location, field coordinates, wheat or tomato, optional planting date, growth stage and water availability. Farm settings stay in memory until reload. The initial Meknès wheat profile is a starter configuration; replace it with your own. Planting dates estimate stages from indicative FAO-56 Table 11 Mediterranean durations (winter wheat: 30/140/40/30 days; tomato: 30/40/45/30). Confirm the estimate manually, especially beyond the nominal season.

The dashboard shows live data, or an explicit unavailable state with retry. The heatwave demo uses a synthetic seven-day sequence and never represents actual weather. Scenario lab increases temperature only; all other variables stay fixed, so its water screening is unchanged. Static field guidance stays available without an AI key and is never presented as generated advice. AI advice supports French and Arabic, including RTL output.

## Checks

```sh
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
# With the dev server running; includes a live provider request:
node scripts/smoke-test.mjs
```

## Climate-risk API

Set `GOOGLE_API_KEY` on the server for advice, for example in a root `.env.local` file. Environment variables are validated when Next.js loads its configuration; the key is optional, but if provided it must contain non-whitespace characters. An unset or empty key leaves advice unavailable. The server calls Google's `gemma-4-26b-a4b-it`; never expose the key to the browser. Weather uses Open-Meteo's forecast API and is cached for 30 minutes upstream (responses may be cached by clients for 5 minutes). Assessment and advice responses are not cached. Production deployments should apply appropriate rate and spending limits at the edge; these endpoints have no authentication.

All responses use `{ "data": ... }` or `{ "error": { "code": ..., "message": ... } }`. Validation errors return 400, provider errors return 502, and unavailable configuration or a a missing API key returns 503.

- `GET /api/weather?latitude=33.59&longitude=-7.62` returns `data.days`, seven consecutive local calendar days, with temperatures in °C, rain and reference evapotranspiration (ET₀) in mm/day, mean hourly relative humidity in percent, and maximum wind speed in km/h. The response location is the provider's grid location, and `timezone` is the provider's local timezone. Missing forecast values produce an error rather than a false zero.
- `POST /api/assess` accepts JSON `{ "crop": "wheat", "growthStage": "mid", "waterAvailability": "limited", "forecast": [...] }`, where `forecast` is the seven-day `data.days` array from weather. Crops are `wheat` and `tomato`; stages are `initial`, `development`, `mid`, and `late`; availability is `adequate`, `limited`, or `unknown`. Days must be consecutive. The response provides the rules' intermediate values and limitations.
- `POST /api/advice` accepts `{ "assessmentInput": { ... }, "language": "ary" }`, with the same assessment input as above. Languages are `ar` (Arabic), `fr` (French), and `ary` (Moroccan Darija). The server recalculates the assessment and sends it to Gemma; callers cannot supply their own assessment or prompts. Advice is generated text and can still contain mistakes; numeric output is rejected, but the model cannot be guaranteed to obey every instruction. Review before relying on it.

The heat thresholds and risk categories are screening heuristics informed by crop research, not universal damage thresholds. The water indicator compares gross forecast rain with standard-condition ETc (ET₀ × approximate FAO-56 crop coefficient); it is not a soil water balance, a measured stress diagnosis, or an irrigation recommendation. The development and late coefficients are midpoint approximations. Local variety, growth stage, rainfall effectiveness, soil storage and management can change outcomes. Consult local agricultural expertise for decisions.

## Evidence

- [FAO-56 Tables 11–12](https://www.fao.org/4/x0490e/x0490e0b.htm): indicative stage lengths and standard crop coefficients. Wheat uses the spring-wheat initial coefficient for generic screening; winter wheat and local management may differ. Development and late stages use midpoint approximations rather than a daily coefficient curve.
- [FAO wheat development guide](https://www.fao.org/4/X8234E/x8234e09.htm): temperature context for the wheat screening point.
- [FAO greenhouse vegetable guide](https://www.fao.org/3/i6787e/i6787e.pdf): tomato environmental requirements; protected-crop guidance requires caution when applied to field crops.
- [Open-Meteo documentation](https://open-meteo.com/en/docs): weather variables and FAO reference evapotranspiration.
- [Google Gemma API documentation](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api): `@google/genai` with `gemma-4-26b-a4b-it`.

Risk category counts are explicit product heuristics rather than validated probabilities. No precise irrigation quantities, schedules, or crop-loss estimates are provided. The AI prompt and numeric guard reduce unsupported claims, but cannot guarantee correctness; advice requires local verification.
