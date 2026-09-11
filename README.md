# SubAIWise

SubAIWise is a static, reviewable explorer for AI coding subscriptions. It turns a locked snapshot of upstream pricing and benchmark observations into a product-owned canonical dataset, then renders comparison, market, and Pareto views from that dataset.

## Development

```bash
npm install
npm run data:sync
npm run dev
```

The repository tracks `data/dataset.json` on purpose. `npm run data:check` re-fetches the exact commit in `data/upstream.lock.json`, applies `data/local.json`, and fails if the checked-in dataset is stale. `npm run data:public` validates and copies that canonical file to `public/data/dataset.json`; `npm run dev` and `npm run build` run it automatically.

## Data flow

```text
real-api-pricing@immutable SHA
          ↓
derived/points.json
derived/benchmark-configurations.json
derived/benchmark-points.json
          ↓
src/data/adapter.ts
          ↓
data/local.json (entry additions / overrides / exclusions)
          ↓
data/dataset.json  (schemaVersion 2)
          ↓
src/domain selectors
          ↓
Compare / Leaderboard / Overview
```

Canonical v2 stores `benchmarkConfigurations` and `benchmarkMappings` as first-class data. `entry.benchmarks` is a derived default summary (`highest_archived_reference`) and is not an independent source of truth. Benchmark configuration/mapping rows are currently upstream-owned; `data/local.json` still patches plan/model entries only. The three upstream files are always read from the same locked commit. Local changes never modify the downloaded payload. For an explicit source update, run:

```bash
npm run data:sync -- --ref <FULL_COMMIT_SHA>
```

## Local data workflow

`data/local.json` is the product-owned patch layer. Use an override when the
upstream identity is still correct but a price, allowance, label, quality note,
or benchmark observation needs correction:

```json
{
  "overrides": {
    "plan-id::model-id": {
      "label": "Preferred display label",
      "pricing": { "monthlyUsd": 20 },
      "allowance": { "monthlyTokens": 200000000 }
    }
  },
  "additions": [],
  "exclusions": []
}
```

Canonical `id`, `plan.id`, and `model.id` are immutable and cannot be changed
by an override. To replace an identity, add the new entry and list the old id
under `exclusions`.

After changing local data, run `npm run data:sync` (or `npm run data:check` to
verify without writing) and commit the resulting canonical dataset.

## Automatic upstream sync

`.github/workflows/sync-upstream.yml` compares the locked commit with upstream
default-branch HEAD for every monitored file (`derived/points.json`,
`derived/benchmark-configurations.json`, `derived/benchmark-points.json`).
README-only commits are a no-op. A change in any monitored file syncs all three
from the same latest SHA. When the dataset changes, it runs the data check,
tests, and build, then updates the single `automation/sync-upstream` branch and
opens or refreshes its pull request. The PR body includes the source SHAs and
added/removed/changed entry summary plus local patch counts.

Pull requests run the locked data check, tests, and production build. The daily GitHub Action only opens or updates a single `automation/sync-upstream` data PR when a monitored upstream file changes.

Base pricing and benchmark data may be sourced from [real-api-pricing](https://github.com/FeiZhuLulu/real-api-pricing). SubAIWise owns the canonical schema, normalization, local patches, and product presentation.
