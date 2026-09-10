# SubAIWise

SubAIWise is a static, reviewable explorer for AI coding subscriptions. It turns a locked snapshot of upstream pricing and benchmark observations into a product-owned canonical dataset, then renders comparison, market, and Pareto views from that dataset.

## Development

```bash
npm install
npm run data:sync
npm run dev
```

The repository tracks `data/dataset.json` on purpose. `npm run data:check` re-fetches the exact commit in `data/upstream.lock.json`, applies `data/local.json`, and fails if the checked-in dataset is stale.

## Data flow

```text
real-api-pricing@immutable SHA
          ↓
src/data/upstream-schema.ts
          ↓
src/data/adapter.ts
          ↓
data/local.json (additions / overrides / exclusions)
          ↓
data/dataset.json
          ↓
SubAIWise UI
```

The data layer only consumes `SubAIWiseEntry`; upstream field names stop at the adapter boundary. The reference explorer UI is kept visually identical through the derived `src/data/view-model.ts` compatibility boundary. Local changes never modify the downloaded payload. For an explicit source update, run:

```bash
npm run data:sync -- --ref <FULL_COMMIT_SHA>
```

Pull requests run the locked data check, tests, and production build. A daily GitHub Action checks the upstream repository and opens or updates a single `automation/sync-upstream` data PR when a new commit is available.

Base pricing and benchmark data may be sourced from [real-api-pricing](https://github.com/FeiZhuLulu/real-api-pricing). SubAIWise owns the canonical schema, normalization, local patches, and product presentation.
