# AgriPredict verification — 28 October 2026

The forecast, screening, onboarding and demo flows passed the executed checks. Live Gemma advice is not verified and should not be relied on for a live demo until the provider succeeds.

## Executed results

| Check                                  | Result                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm exec tsc --noEmit`               | Passed                                                                                                                                                       |
| `pnpm lint`                            | Passed after fixing two UI lint errors                                                                                                                       |
| `pnpm test`                            | 14 tests passed, zero failed; Node 24.22.1                                                                                                                   |
| Existing `node scripts/smoke-test.mjs` | Passed against the final production server; this script permits AI unavailability and does not prove generation works                                        |
| Additional production HTTP checks      | 52 assertions passed, including two malformed-date regressions                                                                                               |
| Chrome browser end-to-end checks       | 60 assertions passed against the final production build                                                                                                      |
| `pnpm build` (Turbopack)               | Failed: its loader worker could not bind a port under the execution restrictions; repeating with elevated tool access produced the same error                |
| `pnpm exec next build --webpack`       | Passed on the final sources, including TypeScript and prerendering                                                                                           |
| Production server                      | Started successfully and served the tested application and endpoints                                                                                         |
| Secret exposure checks                 | No key matches in 26 final client artifacts; no Google provider URL in those artifacts; env/source/Git file requests returned 404; env files are Git-ignored |

HTTP checks covered both crops, every growth stage and water-availability combination, unsupported methods, absent/duplicate/extra/invalid coordinates, malformed JSON, oversized bodies, invalid crop/language/extra fields, missing days, duplicate/invalid dates, negative rainfall and inverted temperatures. Provider adapter tests simulated transport, HTTP, malformed JSON, incomplete data and missing humidity failures. Advice tests used a mocked SDK to exercise language prompts, recalculated evidence, empty/truncated responses, numeric output rejection in three numeral scripts and safe provider errors. Mocked outputs are not live model verification.

Browser checks covered preset and custom locations, both crops, planting dates and stage boundaries, recalculation after changing crops, manual stage correction, all water choices, saved settings, invalid names and blank coordinates, modal Escape, all forecast charts, selected-day details, risk alerts and methodology, synthetic heatwave labels, scenario slider, loading/disabled controls, weather/assessment failure and retry, AI errors, Arabic RTL and stale advice rejection. Layouts were checked at widths from 320 through 1440 pixels; screenshots were inspected. Arabic success rendering used a mocked HTTP response. No uncaught browser errors occurred in the main suite.

## Confirmed fixes

- Malformed forecast dates could throw inside the consecutive-date refinement and produce HTTP 500. Both POST endpoints now return HTTP 400; regression coverage added.
- Clearing longitude silently changed it to zero and allowed saving an unintended location. Empty coordinate inputs now remain empty and cannot be submitted.
- The mobile hero heading overlapped the weather reading. Mobile content now flows without overlap; checked at six viewport widths.
- Growth-stage boundaries used elapsed UTC time instead of the Casablanca calendar date. Calendar-day calculation and midnight regression coverage added.
- The mobile hook now subscribes to media-query state using `useSyncExternalStore`. Carousel initial synchronization is documented for lint and its `reInit` listener is removed during cleanup.
- A live Gemma diagnostic confirmed that the original 1,000-token budget was consumed by thinking (998 thinking tokens), yielding no final answer. The budget is now bounded at 4,096 tokens. This does not establish provider reliability: larger requests still failed in live tests. Google's documented minimal-thinking setting returned provider HTTP 500 and was not retained.
- Added `pnpm test` and repeatable API/validation regression coverage without new dependencies.

## Data and methodology

A real request through the production weather endpoint returned seven days beginning 28 October 2026, with Open-Meteo source metadata and its model-grid coordinates. Adapter tests verify field mapping and daily humidity averaging. The application did not substitute synthetic data during simulated provider failures.

FAO-56 Tables 11–12 were retrieved and checked: wheat stage lengths 30/140/40/30 and tomato 30/40/45/30 match the implementation. Initial/mid coefficients and documented development/late midpoint approximations match the arithmetic. Wheat uses a spring-wheat initial coefficient despite winter-wheat calendar durations; this simplification is disclosed. These remain approximate screening inputs.

The wheat source discusses mean-temperature development bounds, not a validated daily-maximum damage threshold. The app's daily-maximum flags and hot-day categories are explicitly product heuristics. Tomato's indexed FAO text discusses reduced fruit set above 35°C in greenhouse conditions; this does not validate field damage predictions. No validated yield-loss probability, measured soil moisture or irrigation prescription is calculated.

Sources checked:

- [FAO-56 stage lengths and coefficients](https://www.fao.org/4/x0490e/x0490e0b.htm)
- [FAO wheat development](https://www.fao.org/4/X8234E/x8234e09.htm)
- [Indexed FAO tomato text on an author repository](https://iris.unito.it/retrieve/e27ce42b-89e9-2581-e053-d805fe0acbaa/2017_FAO%20GAP%20for%20greenhouse%20vegetable%20production%20in%20SEE%20countries.pdf)
- [Google Gemma API and thinking configuration](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api)

## Blockers and remaining risks

- Final live French, Arabic and Darija advice requests returned HTTP 502 `AI_UNAVAILABLE`. Direct SDK diagnostics observed provider HTTP 500/504; earlier original-budget calls also returned incomplete output. The key was loading during final tests. Actual generated language quality and grounding could not be verified.
- The original FAO tomato PDF URL redirects to the repository homepage. The indexed author-hosted PDF supports the temperature context, but direct full-text retrieval was blocked by its access challenge. The original citation link remains unresolved.
- Turbopack's default build remains blocked in this restricted execution environment. The supported webpack build is verified; no bundler configuration was changed.
- Browser coverage used desktop Chrome with emulated viewports, not physical phones, Safari or Firefox. No load/stress test or independent agronomic validation was performed.
- Screening categories are heuristics; demand versus gross rainfall is not a soil-water balance. AI numeric filtering does not prove grounding. Public endpoints have no authentication, request-rate controls or spending caps. Farm settings intentionally reset on page reload.

For a demo now, the verified weather, screening and hypothetical scenario flows are usable. Live generated advice remains a blocker.
