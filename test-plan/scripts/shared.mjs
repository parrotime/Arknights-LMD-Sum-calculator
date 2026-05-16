import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "../..");
export const REPORT_DIR = path.join(ROOT, "test-plan", "reports");
export const CASE_DIR = path.join(ROOT, "test-plan", "cases");
export const ITEMS_FILE = path.join(ROOT, "data", "gameItems.json");

export const defaultSettings = {
  allow3Star: true,
  allow2Star: true,
  allowMaterial: true,
  allowStore20: true,
  allowStore10: true,
  allowStore70: true,
  allowStore2000: true,
  allowStore5000: true,
  allowCE: true,
  allowExt25: true,
  allowTrade: true,
  allowUpgradeOnly0: true,
  allowUpgradeOnly1: true,
  allowUpgradeOnly2: true,
  allowUpgradeOnlyFor1: false,
  allowOrundumsGreen: true,
  allowOrundumsDevice: true
};

export function parseArgs(argv = process.argv.slice(2)) {
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

export function ensureReportDir() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeJson(file, data) {
  ensureReportDir();
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function writeText(file, text) {
  ensureReportDir();
  fs.writeFileSync(file, text, "utf8");
}

export function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function loadItems() {
  const items = readJson(ITEMS_FILE);
  return {
    items,
    itemMap: new Map(items.map((item) => [Number(item.id), item]))
  };
}

export function loadCaseFile(name) {
  const file = path.join(CASE_DIR, name);
  return readJson(file);
}

export function loadCaseFiles(names) {
  return names.flatMap((name) => {
    const group = loadCaseFile(name);
    return group.cases.map((testCase) => ({
      ...testCase,
      group: group.name
    }));
  });
}

export function buildRequestBody(testCase, mode = "fast") {
  return {
    target: testCase.target,
    settings: {
      ...defaultSettings,
      ...(testCase.settings || {})
    },
    userLimits: {
      ...(testCase.userLimits || {})
    },
    rawGoal: testCase.rawGoal ?? Math.max(0, 100000 + Number(testCase.target || 0)),
    calcMode: testCase.calcMode || mode
  };
}

export async function postFindPaths({ url, body, timeoutMs = 20000 }) {
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

export function pathKey(resultPath) {
  return [...resultPath]
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((step) => `${Number(step.id)}x${Number(step.count)}`)
    .join("_");
}

export function pathSum(resultPath, itemMap) {
  return resultPath.reduce((sum, step) => {
    const item = itemMap.get(Number(step.id));
    return sum + Number(item?.item_value || 0) * Number(step.count || 0);
  }, 0);
}

export function operationCount(resultPath) {
  return resultPath.reduce((sum, step) => sum + Number(step.count || 0), 0);
}

export function pathStats(paths) {
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
    avgStepTypes: average(stepTypes),
    minOperationCount: Math.min(...operations),
    avgOperationCount: average(operations)
  };
}

export function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

export function summarizeTimings(records) {
  const timings = records
    .filter((record) => record.status >= 200 && record.status < 300)
    .map((record) => record.durationMsClient);
  const count = records.length;
  const ok = records.filter((record) => record.status >= 200 && record.status < 300).length;
  const failed = count - ok;
  const timeouts = records.filter((record) => record.timeout || record.status === 504).length;
  const cacheHits = records.filter((record) => record.cache === "hit").length;

  return {
    count,
    ok,
    failed,
    errorRate: count ? failed / count : 0,
    timeoutRate: count ? timeouts / count : 0,
    cacheHitRate: count ? cacheHits / count : 0,
    avg: average(timings),
    p50: percentile(timings, 50),
    p90: percentile(timings, 90),
    p95: percentile(timings, 95),
    p99: percentile(timings, 99),
    min: timings.length ? Math.min(...timings) : 0,
    max: timings.length ? Math.max(...timings) : 0
  };
}

export function collectEnvironment() {
  const cpus = os.cpus();
  const firstCpu = cpus[0] || {};
  return {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    cpuModel: firstCpu.model || "unknown",
    logicalCpuCount: cpus.length,
    totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
    freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
    env: {
      NODE_ENV: process.env.NODE_ENV || null,
      WORKER_POOL_SIZE: process.env.WORKER_POOL_SIZE || null,
      GOMAXPROCS: process.env.GOMAXPROCS || null,
      PORT: process.env.PORT || null
    }
  };
}

export function hasRemovableZeroSumSubset(resultPath, itemMap) {
  if (!Array.isArray(resultPath) || resultPath.length < 2 || resultPath.length > 18) {
    return false;
  }

  const expanded = [];
  for (const step of resultPath) {
    const item = itemMap.get(Number(step.id));
    const value = Number(item?.item_value || 0);
    const count = Number(step.count || 0);
    for (let i = 0; i < count; i += 1) {
      expanded.push({ id: Number(step.id), value });
      if (expanded.length > 22) return false;
    }
  }

  const totalMasks = 1 << expanded.length;
  for (let mask = 1; mask < totalMasks - 1; mask += 1) {
    let sum = 0;
    let hasPositive = false;
    let hasNegative = false;
    for (let i = 0; i < expanded.length; i += 1) {
      if ((mask & (1 << i)) === 0) continue;
      sum += expanded[i].value;
      hasPositive ||= expanded[i].value > 0;
      hasNegative ||= expanded[i].value < 0;
    }
    if (sum === 0 && hasPositive && hasNegative) {
      return true;
    }
  }
  return false;
}

export function validateCaseResult({ testCase, response, itemMap }) {
  const failures = [];
  const expect = testCase.expect || {};
  const expectedStatus = expect.status || 200;

  if (response.status !== expectedStatus) {
    failures.push(`status expected ${expectedStatus}, got ${response.status}`);
  }

  if (expectedStatus < 200 || expectedStatus >= 300) {
    return failures;
  }

  const data = response.data || {};
  const paths = data.paths;
  if (data.success !== true) failures.push("success is not true");
  if (!Array.isArray(paths)) {
    failures.push("paths is not an array");
    return failures;
  }
  if (paths.length === 0 && expect.allowEmpty !== true) {
    failures.push("paths is empty");
  }

  for (const [index, resultPath] of paths.entries()) {
    const sum = pathSum(resultPath, itemMap);
    if (sum !== testCase.target) {
      failures.push(`path ${index} sum expected ${testCase.target}, got ${sum}`);
    }
  }

  const keys = paths.map(pathKey);
  for (const requiredKey of expect.requiredPathKeys || []) {
    if (!keys.includes(requiredKey)) {
      failures.push(`required path missing: ${requiredKey}`);
    }
  }
  for (const forbiddenKey of expect.forbiddenPathKeys || []) {
    if (keys.includes(forbiddenKey)) {
      failures.push(`forbidden path exists: ${forbiddenKey}`);
    }
  }

  if (expect.maxPathCount !== undefined && paths.length > expect.maxPathCount) {
    failures.push(`path count expected <= ${expect.maxPathCount}, got ${paths.length}`);
  }

  if (expect.maxItemCounts) {
    for (const [id, maxCount] of Object.entries(expect.maxItemCounts)) {
      for (const [index, resultPath] of paths.entries()) {
        const actual = resultPath
          .filter((step) => String(step.id) === String(id))
          .reduce((sum, step) => sum + Number(step.count || 0), 0);
        if (actual > Number(maxCount)) {
          failures.push(`path ${index} item ${id} expected <= ${maxCount}, got ${actual}`);
        }
      }
    }
  }

  if (expect.noRemovableZeroSumSubset) {
    for (const [index, resultPath] of paths.entries()) {
      if (hasRemovableZeroSumSubset(resultPath, itemMap)) {
        failures.push(`path ${index} has removable zero-sum subset`);
      }
    }
  }

  return failures;
}

export function makeRecord({ backend, mode, testCase, response }) {
  const paths = response.data?.paths;
  const stats = pathStats(paths);
  return {
    backend,
    mode,
    group: testCase.group,
    caseName: testCase.name,
    target: testCase.target,
    status: response.status,
    success: response.data?.success === true,
    cache: response.data?.cache || null,
    durationMsClient: Number(response.durationMsClient.toFixed(2)),
    durationMsServer: typeof response.data?.duration === "number" ? response.data.duration : null,
    timeout: response.timeout,
    error: response.data?.error || null,
    ...stats
  };
}

export function markdownSummary(title, payload) {
  const lines = [
    `# ${title}`,
    "",
    `- backend: ${payload.backend}`,
    `- mode: ${payload.mode}`,
    `- url: ${payload.url}`,
    `- createdAt: ${payload.createdAt}`,
    ""
  ];

  if (payload.environment) {
    lines.push("## Environment", "");
    lines.push("| field | value |");
    lines.push("| --- | --- |");
    lines.push(`| platform | ${payload.environment.platform} |`);
    lines.push(`| arch | ${payload.environment.arch} |`);
    lines.push(`| node | ${payload.environment.node} |`);
    lines.push(`| cpuModel | ${payload.environment.cpuModel} |`);
    lines.push(`| logicalCpuCount | ${payload.environment.logicalCpuCount} |`);
    lines.push(`| totalMemoryMB | ${payload.environment.totalMemoryMB} |`);
    lines.push(`| freeMemoryMB | ${payload.environment.freeMemoryMB} |`);
    lines.push("");
  }

  if (payload.summary) {
    lines.push("## Summary", "");
    lines.push("| metric | value |");
    lines.push("| --- | ---: |");
    for (const [key, value] of Object.entries(payload.summary)) {
      const formatted = typeof value === "number" ? value.toFixed(2) : value;
      lines.push(`| ${key} | ${formatted} |`);
    }
    lines.push("");
  }

  if (payload.failures?.length) {
    lines.push("## Failures", "");
    for (const failure of payload.failures) {
      lines.push(`- ${failure.caseName}: ${failure.failures.join("; ")}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
