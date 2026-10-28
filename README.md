This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Climate-risk API

Set `GOOGLE_API_KEY` on the server for advice, for example in a root `.env.local` file. Environment variables are validated when Next.js loads its configuration; the key is optional, but if provided it must contain non-whitespace characters. An unset or empty key leaves advice unavailable. The server calls Google's `gemma-4-26b-a4b-it`; never expose the key to the browser. Weather uses Open-Meteo's forecast API and is cached for 30 minutes upstream (responses may be cached by clients for 5 minutes). Assessment and advice responses are not cached. Production deployments should apply appropriate rate and spending limits at the edge; these endpoints have no authentication.

All responses use `{ "data": ... }` or `{ "error": { "code": ..., "message": ... } }`. Validation errors return 400, provider errors return 502, and unavailable configuration or a provider rate limit returns 503.

- `GET /api/weather?latitude=33.59&longitude=-7.62` returns `data.days`, seven consecutive local calendar days, with temperatures in °C, rain and reference evapotranspiration (ET₀) in mm/day, mean hourly relative humidity in percent, and maximum wind speed in km/h. The response location is the provider's grid location, and `timezone` is the provider's local timezone. Missing forecast values produce an error rather than a false zero.
- `POST /api/assess` accepts JSON `{ "crop": "wheat", "growthStage": "mid", "waterAvailability": "limited", "forecast": [...] }`, where `forecast` is the seven-day `data.days` array from weather. Crops are `wheat` and `tomato`; stages are `initial`, `development`, `mid`, and `late`; availability is `adequate`, `limited`, or `unknown`. Days must be consecutive. The response provides the rules' intermediate values and limitations.
- `POST /api/advice` accepts `{ "assessmentInput": { ... }, "language": "ary" }`, with the same assessment input as above. Languages are `ar` (Arabic), `fr` (French), and `ary` (Moroccan Darija). The server recalculates the assessment and sends it to Gemma; callers cannot supply their own assessment or prompts. Advice is generated text and can still contain mistakes; numeric output is rejected, but the model cannot be guaranteed to obey every instruction. Review before relying on it.

The heat thresholds and risk categories are screening heuristics informed by crop research, not universal damage thresholds. The water indicator compares gross forecast rain with standard-condition ETc (ET₀ × approximate FAO-56 crop coefficient); it is not a soil water balance, a measured stress diagnosis, or an irrigation recommendation. The development and late coefficients are midpoint approximations. Local variety, growth stage, rainfall effectiveness, soil storage and management can change outcomes. Consult local agricultural expertise for decisions.
