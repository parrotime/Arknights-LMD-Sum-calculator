import path from "node:path";
import {
  REPORT_DIR,
  parseArgs,
  readJson,
  timestamp,
  writeJson,
  writeText
} from "./shared.mjs";

const args = parseArgs();

if (!args.base || !args.next) {
  console.error("Usage: node test-plan/scripts/compare-results.mjs --base <js-report.json> --next <go-report.json>");
  process.exit(1);
}

const base = readJson(path.resolve(args.base));
const next = readJson(path.resolve(args.next));

function ratio(nextValue, baseValue) {
  if (!baseValue) return null;
  return nextValue / baseValue;
}

function speedup(baseValue, nextValue) {
  if (!nextValue) return null;
  return baseValue / nextValue;
}

const comparison = {
  type: "comparison",
  createdAt: new Date().toISOString(),
  base: {
    backend: base.backend,
    mode: base.mode,
    summary: base.summary,
    coldSummary: base.coldSummary,
    warmSummary: base.warmSummary
  },
  next: {
    backend: next.backend,
    mode: next.mode,
    summary: next.summary,
    coldSummary: next.coldSummary,
    warmSummary: next.warmSummary
  },
  metrics: {
    overallP95Speedup: speedup(base.summary?.p95, next.summary?.p95),
    overallAvgSpeedup: speedup(base.summary?.avg, next.summary?.avg),
    coldP95Speedup: speedup(base.coldSummary?.p95, next.coldSummary?.p95),
    warmP95Speedup: speedup(base.warmSummary?.p95, next.warmSummary?.p95),
    errorRateRatio: ratio(next.summary?.errorRate, base.summary?.errorRate),
    timeoutRateRatio: ratio(next.summary?.timeoutRate, base.summary?.timeoutRate)
  }
};

const lines = [
  "# Backend Comparison Report",
  "",
  `- base: ${base.backend}/${base.mode}`,
  `- next: ${next.backend}/${next.mode}`,
  `- createdAt: ${comparison.createdAt}`,
  "",
  "| metric | value |",
  "| --- | ---: |"
];

for (const [key, value] of Object.entries(comparison.metrics)) {
  lines.push(`| ${key} | ${value === null ? "N/A" : value.toFixed(2)} |`);
}

const stamp = timestamp();
const jsonFile = path.join(REPORT_DIR, `comparison-${stamp}.json`);
const mdFile = path.join(REPORT_DIR, `comparison-${stamp}.md`);
writeJson(jsonFile, comparison);
writeText(mdFile, `${lines.join("\n")}\n`);

console.log(`Report JSON: ${jsonFile}`);
console.log(`Report MD:   ${mdFile}`);
