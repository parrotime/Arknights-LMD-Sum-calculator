import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const defaultSettings = {
  allow3Star: true,
  allow2Star: true,
  allowMaterial: true,
  allowStore20: false,
  allowStore10: false,
  allowStore70: true,
  allowStore2000: true,
  allowStore5000: true,
  allowCE: false,
  allowExt25: false,
  allowTrade: true,
  allowUpgradeOnly0: true,
  allowUpgradeOnly1: true,
  allowUpgradeOnly2: true,
  allowUpgradeOnlyFor1: true,
  allowOrundumsGreen: false,
  allowOrundumsDevice: false
};

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sanitizeLabel(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function operationCount(resultPath) {
  if (!Array.isArray(resultPath)) return 0;
  return resultPath.reduce((sum, step) => sum + Number(step.count || 0), 0);
}

function pathStats(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    return {
      pathCount: 0,
      minStepTypes: 0,
      avgStepTypes: 0,
      minOperationCount: 0,
      avgOperationCount: 0
    };
  }

  const stepTypes = paths.map((p) => p.length);
  const operations = paths.map(operationCount);
  return {
    pathCount: paths.length,
    minStepTypes: Math.min(...stepTypes),
    avgStepTypes: Number(average(stepTypes).toFixed(2)),
    minOperationCount: Math.min(...operations),
    avgOperationCount: Number(average(operations).toFixed(2))
  };
}

function summarize(records) {
  const okRecords = records.filter((record) => record.status >= 200 && record.status < 300);
  const timings = okRecords.map((record) => record.durationMsClient);
  const serverTimings = okRecords
    .map((record) => record.durationMsServer)
    .filter((value) => typeof value === "number");
  const count = records.length;
  const failed = count - okRecords.length;
  const timeouts = records.filter((record) => record.timeout || record.status === 504).length;
  const cacheHits = records.filter((record) => record.cache === "hit").length;

  return {
    count,
    ok: okRecords.length,
    failed,
    errorRate: count ? Number((failed / count).toFixed(4)) : 0,
    timeoutRate: count ? Number((timeouts / count).toFixed(4)) : 0,
    cacheHitRate: count ? Number((cacheHits / count).toFixed(4)) : 0,
    clientAvgMs: Number(average(timings).toFixed(2)),
    clientP50Ms: Number(percentile(timings, 50).toFixed(2)),
    clientP90Ms: Number(percentile(timings, 90).toFixed(2)),
    clientP95Ms: Number(percentile(timings, 95).toFixed(2)),
    clientP99Ms: Number(percentile(timings, 99).toFixed(2)),
    clientMinMs: timings.length ? Number(Math.min(...timings).toFixed(2)) : 0,
    clientMaxMs: timings.length ? Number(Math.max(...timings).toFixed(2)) : 0,
    serverAvgMs: Number(average(serverTimings).toFixed(2)),
    serverP95Ms: Number(percentile(serverTimings, 95).toFixed(2))
  };
}

function collectEnvironment() {
  const cpus = os.cpus();
  return {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    cpuModel: cpus[0]?.model || "unknown",
    logicalCpuCount: cpus.length,
    totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
    freeMemoryMB: Math.round(os.freemem() / 1024 / 1024)
  };
}

function flattenCases(caseConfig, selectedGroups) {
  const defaults = caseConfig.defaults || {};
  const groups = caseConfig.groups || [];
  const selected = selectedGroups.length ? new Set(selectedGroups) : null;
  const cases = [];

  for (const group of groups) {
    if (selected && !selected.has(group.name)) continue;
    for (const testCase of group.cases || []) {
      const settings = {
        ...defaultSettings,
        ...(defaults.settings || {}),
        ...(testCase.settings || {})
      };
      const userLimits = {
        ...(defaults.userLimits || {}),
        ...(testCase.userLimits || {})
      };
      const rawGoalBase = Number(testCase.rawGoalBase ?? defaults.rawGoalBase ?? 100000);
      cases.push({
        ...testCase,
        group: group.name,
        settings,
        userLimits,
        rawGoal: testCase.rawGoal ?? Math.max(0, rawGoalBase + Number(testCase.target || 0))
      });
    }
  }

  return cases;
}

function buildGoBody(testCase, mode) {
  return {
    target: Number(testCase.target),
    settings: testCase.settings,
    userLimits: testCase.userLimits || {},
    rawGoal: testCase.rawGoal,
    calcMode: mode
  };
}

async function postFindPaths({ url, body, timeoutMs }) {
  const endpoint = `${url.replace(/\/$/, "")}/find-paths`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    const elapsed = performance.now() - started;
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text };
    }
    return {
      status: response.status,
      ok: response.ok,
      data,
      durationMsClient: elapsed,
      timeout: false
    };
  } catch (error) {
    const elapsed = performance.now() - started;
    return {
      status: 0,
      ok: false,
      data: { error: error.name === "AbortError" ? "request timeout" : error.message },
      durationMsClient: elapsed,
      timeout: error.name === "AbortError"
    };
  } finally {
    clearTimeout(timeout);
  }
}

function makeRecord({ backend, mode, testCase, run, response }) {
  const paths = response.data?.paths;
  return {
    backend,
    calcMode: mode,
    group: testCase.group,
    caseName: testCase.name,
    target: Number(testCase.target),
    run,
    status: response.status,
    success: response.data?.success === true,
    cache: response.data?.cache || null,
    durationMsClient: Number(response.durationMsClient.toFixed(2)),
    durationMsServer: typeof response.data?.duration === "number" ? response.data.duration : null,
    timeout: response.timeout,
    error: response.data?.error || null,
    ...pathStats(paths)
  };
}

function markdownReport(payload) {
  const lines = [
    "# Go Benchmark Report",
    "",
    `- backend: ${payload.backend}`,
    `- mode: ${payload.mode}`,
    `- url: ${payload.url}`,
    `- createdAt: ${payload.createdAt}`,
    `- caseFile: ${payload.caseFile}`,
    `- runs: ${payload.runs}`,
    `- delayMs: ${payload.delayMs}`,
    `- label: ${payload.label || "-"}`,
    "",
    "## Summary",
    "",
    "| metric | value |",
    "| --- | ---: |"
  ];

  for (const [key, value] of Object.entries(payload.summary)) {
    lines.push(`| ${key} | ${value} |`);
  }

  lines.push("", "## By Group", "", "| group | count | ok | clientAvgMs | clientP95Ms | serverAvgMs | cacheHitRate |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const [group, summary] of Object.entries(payload.groupSummary)) {
    lines.push(`| ${group} | ${summary.count} | ${summary.ok} | ${summary.clientAvgMs} | ${summary.clientP95Ms} | ${summary.serverAvgMs} | ${summary.cacheHitRate} |`);
  }

  lines.push("", "## Slowest Requests", "", "| case | run | status | cache | clientMs | serverMs | paths | error |", "| --- | ---: | ---: | --- | ---: | ---: | ---: | --- |");
  const slowest = [...payload.records]
    .sort((a, b) => b.durationMsClient - a.durationMsClient)
    .slice(0, 15);
  for (const record of slowest) {
    lines.push(`| ${record.group}/${record.caseName} | ${record.run} | ${record.status} | ${record.cache || "-"} | ${record.durationMsClient} | ${record.durationMsServer ?? "-"} | ${record.pathCount} | ${record.error || ""} |`);
  }

  if (payload.failures.length) {
    lines.push("", "## Failures", "");
    for (const failure of payload.failures) {
      lines.push(`- ${failure.group}/${failure.caseName} run=${failure.run}: status=${failure.status}, error=${failure.error || "unknown"}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const args = parseArgs();
const mode = String(args.mode || "fast").toLowerCase();
if (!["fast", "strong"].includes(mode)) {
  console.error("--mode must be fast or strong");
  process.exit(1);
}

const backend = `go-${mode}`;
const url = args.url || "http://127.0.0.1:3103";
const caseFile = path.resolve(args["case-file"] || path.join(ROOT, "cases", "js-legacy-benchmark.cases.json"));
const reportDir = path.resolve(args["report-dir"] || path.join(ROOT, "reports"));
const runs = Number(args.runs || 3);
const timeoutMs = Number(args.timeout || 60000);
const delayMs = Number(args.delay || 0);
const selectedGroups = String(args.groups || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const label = sanitizeLabel(args.label || selectedGroups.join("-"));

if (!fs.existsSync(caseFile)) {
  console.error(`Case file not found: ${caseFile}`);
  process.exit(1);
}
if (!Number.isInteger(runs) || runs < 1) {
  console.error("--runs must be a positive integer");
  process.exit(1);
}

const caseConfig = readJson(caseFile);
const cases = flattenCases(caseConfig, selectedGroups);

if (!cases.length) {
  console.error("No test cases selected. Check --groups or case file content.");
  process.exit(1);
}

const records = [];
const failures = [];

for (const testCase of cases) {
  const body = buildGoBody(testCase, mode);
  for (let run = 1; run <= runs; run += 1) {
    if (records.length > 0 && delayMs > 0) {
      await sleep(delayMs);
    }

    const response = await postFindPaths({ url, body, timeoutMs });
    const record = makeRecord({ backend, mode, testCase, run, response });
    records.push(record);

    if (record.status < 200 || record.status >= 300 || record.success !== true) {
      failures.push(record);
    }

    const mark = record.success ? "OK" : "FAIL";
    console.log(`${mark} ${testCase.group}/${testCase.name} mode=${mode} run=${run} status=${record.status} cache=${record.cache || "-"} client=${record.durationMsClient}ms server=${record.durationMsServer ?? "-"}ms paths=${record.pathCount}`);
  }
}

const groupSummary = {};
for (const group of new Set(records.map((record) => record.group))) {
  groupSummary[group] = summarize(records.filter((record) => record.group === group));
}

const payload = {
  type: "go-benchmark",
  backend,
  mode,
  url,
  caseFile,
  runs,
  timeoutMs,
  delayMs,
  label,
  selectedGroups,
  createdAt: new Date().toISOString(),
  environment: collectEnvironment(),
  summary: summarize(records),
  groupSummary,
  records,
  failures
};

const stamp = timestamp();
const labelPart = label ? `${label}-` : "";
const jsonFile = path.join(reportDir, `go-benchmark-${mode}-${labelPart}${stamp}.json`);
const jsonlFile = path.join(reportDir, `go-benchmark-${mode}-${labelPart}${stamp}.jsonl`);
const mdFile = path.join(reportDir, `go-benchmark-${mode}-${labelPart}${stamp}.md`);

writeJson(jsonFile, payload);
writeText(jsonlFile, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`);
writeText(mdFile, markdownReport(payload));

console.log("");
console.log(`Report JSON: ${jsonFile}`);
console.log(`Report JSONL: ${jsonlFile}`);
console.log(`Report MD:   ${mdFile}`);

if (failures.length > 0) {
  process.exitCode = 1;
}
