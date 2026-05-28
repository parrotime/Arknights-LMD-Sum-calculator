import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

const DEFAULT_INPUT = resolve(PROJECT_ROOT, "backend-out (5).log");
const DEFAULT_OUT_DIR = __dirname;
const DEFAULT_REPORT = "legacy_analysis_report.txt";
const DEFAULT_DATA = "legacy_analysis_data.json";
const DEFAULT_FRONTEND_DATA = resolve(PROJECT_ROOT, "src", "data", "legacyLogStats.json");

const REQUEST_PATTERNS = {
  goal: /^\[([^\]]+)\] Goal\(用户想凑\) = (-?\d+) Diff\(差值\): target = (-?\d+) items length = (\d+) limits = \{/,
  timestampedValidated: /^\[([^\]]+)\] 后端接收请求 \(Validated\): target = (-?\d+) items length = (\d+) limits = \{/,
  untimestampedValidated: /^后端接收请求 \(Validated\): target = (-?\d+) items length = (\d+) limits = \{/,
};

const LIMIT_FIELDS = [
  "upgrade0Limit",
  "upgrade1Limit",
  "upgrade2Limit",
  "sanityLimit",
];

const stats = {
  source: {
    input: "",
    generatedAt: "",
    lineCount: 0,
  },
  summary: {
    totalRequests: 0,
    timestampedRequests: 0,
    undatedRequests: 0,
    goalRequests: 0,
    uniqueIPs: 0,
    cacheMisses: 0,
    cacheStores: 0,
    emptyResults: 0,
    durationCount: 0,
    durationTotalMs: 0,
    averageDurationMs: 0,
    firstTimestamp: "",
    lastTimestamp: "",
    activeDays: 0,
    avgDailyTimestampedRequests: 0,
  },
  requestFormats: {
    goal: 0,
    timestampedValidated: 0,
    untimestampedValidated: 0,
  },
  targetDistribution: {},
  exactTargetDistribution: {},
  goalDistribution: {},
  exactGoalDistribution: {},
  limitCombinations: {},
  itemsLengthDistribution: {},
  timeDistribution: {},
  dayDistribution: {},
  weekDistribution: {},
  monthDistribution: {},
  durationDistribution: {},
  specialNumberHits: {
    "520": 0,
    "1314": 0,
    "325": 0,
    "799": 0,
    "114514": 0,
    "350234": 0,
  },
  quality: {
    requestsMissingLimitBlock: 0,
    parsedLimitBlocks: 0,
    timestampParseFailures: 0,
  },
};

const uniqueIPs = new Set();
const timestamps = [];

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    outDir: DEFAULT_OUT_DIR,
    reportName: DEFAULT_REPORT,
    dataName: DEFAULT_DATA,
    frontendData: DEFAULT_FRONTEND_DATA,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--input" || arg === "-i") {
      args.input = resolve(PROJECT_ROOT, next || "");
      index++;
    } else if (arg === "--out-dir" || arg === "-o") {
      args.outDir = resolve(PROJECT_ROOT, next || "");
      index++;
    } else if (arg === "--report") {
      args.reportName = next || DEFAULT_REPORT;
      index++;
    } else if (arg === "--data") {
      args.dataName = next || DEFAULT_DATA;
      index++;
    } else if (arg === "--frontend-data") {
      args.frontendData = resolve(PROJECT_ROOT, next || "");
      index++;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`旧版日志分析脚本

用法:
  node _log_analysis/analyze-legacy-logs.mjs
  node _log_analysis/analyze-legacy-logs.mjs --input "backend-out (5).log"
  node _log_analysis/analyze-legacy-logs.mjs --input "backend-out (5).log" --out-dir "_log_analysis"
  node _log_analysis/analyze-legacy-logs.mjs --frontend-data "src/data/legacyLogStats.json"

输出:
  legacy_analysis_report.txt
  legacy_analysis_data.json
  src/data/legacyLogStats.json
`);
}

function increment(map, key, amount = 1) {
  const normalizedKey = String(key);
  map[normalizedKey] = (map[normalizedKey] || 0) + amount;
}

function parseRequestLine(line) {
  const goalMatch = line.match(REQUEST_PATTERNS.goal);
  if (goalMatch) {
    return {
      format: "goal",
      timestampRaw: goalMatch[1],
      goal: Number.parseInt(goalMatch[2], 10),
      target: Number.parseInt(goalMatch[3], 10),
      itemsLength: Number.parseInt(goalMatch[4], 10),
      hasGoal: true,
    };
  }

  const timestampedMatch = line.match(REQUEST_PATTERNS.timestampedValidated);
  if (timestampedMatch) {
    return {
      format: "timestampedValidated",
      timestampRaw: timestampedMatch[1],
      target: Number.parseInt(timestampedMatch[2], 10),
      itemsLength: Number.parseInt(timestampedMatch[3], 10),
      hasGoal: false,
    };
  }

  const untimestampedMatch = line.match(REQUEST_PATTERNS.untimestampedValidated);
  if (untimestampedMatch) {
    return {
      format: "untimestampedValidated",
      timestampRaw: "",
      target: Number.parseInt(untimestampedMatch[1], 10),
      itemsLength: Number.parseInt(untimestampedMatch[2], 10),
      hasGoal: false,
    };
  }

  return null;
}

function parseLegacyTimestamp(raw) {
  if (!raw) return null;
  const match = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDateParts(date) {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  const hour = parts.hour;
  const month = `${parts.year}-${parts.month}`;
  return { day, hour, month };
}

function getWeekKey(date) {
  const shanghaiDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = shanghaiDate.getUTCFullYear();
  const month = shanghaiDate.getUTCMonth();
  const day = shanghaiDate.getUTCDate();
  const normalized = new Date(Date.UTC(year, month, day));
  const weekday = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() + 4 - weekday);
  const weekYear = normalized.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil((((normalized - yearStart) / 86400000) + 1) / 7);
  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

function getLimitKey(limits) {
  const { upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit } = limits;

  if (sanityLimit === 0) return "nosanity";
  if (sanityLimit === 36) return "sanity36";
  if (upgrade0Limit === 0 && upgrade1Limit === 0 && upgrade2Limit === 0) return "noupgrade";
  if (upgrade0Limit == null && upgrade1Limit == null && upgrade2Limit == null && sanityLimit == null) return "none";

  return JSON.stringify({ upgrade0Limit, upgrade1Limit, upgrade2Limit, sanityLimit });
}

function parseLimitValue(line, field) {
  const match = line.match(new RegExp(`${field}:\\s*(null|-?\\d+)`));
  if (!match) return undefined;
  return match[1] === "null" ? null : Number.parseInt(match[1], 10);
}

function recordRequest(request) {
  stats.summary.totalRequests++;
  stats.requestFormats[request.format]++;

  if (request.timestampRaw) {
    const date = parseLegacyTimestamp(request.timestampRaw);
    if (date) {
      stats.summary.timestampedRequests++;
      timestamps.push(date);
      const { day, hour, month } = formatDateParts(date);
      increment(stats.timeDistribution, hour);
      increment(stats.dayDistribution, day);
      increment(stats.weekDistribution, getWeekKey(date));
      increment(stats.monthDistribution, month);
    } else {
      stats.quality.timestampParseFailures++;
      stats.summary.undatedRequests++;
    }
  } else {
    stats.summary.undatedRequests++;
  }

  if (request.hasGoal) {
    stats.summary.goalRequests++;
    const goalBucket = Math.floor(request.goal / 1000) * 1000;
    increment(stats.goalDistribution, goalBucket);
    increment(stats.exactGoalDistribution, request.goal);
    recordSpecialNumberHits(request.goal);
  }

  const targetBucket = Math.floor(request.target / 100) * 100;
  increment(stats.targetDistribution, targetBucket);
  increment(stats.exactTargetDistribution, request.target);
  increment(stats.itemsLengthDistribution, request.itemsLength);
}

function recordSpecialNumberHits(goal) {
  const raw = String(goal);
  for (const key of Object.keys(stats.specialNumberHits)) {
    if (raw.includes(key)) {
      stats.specialNumberHits[key]++;
    }
  }
}

function recordDuration(line) {
  const match = line.match(/后端计算完成, 耗时:\s*(\d+)\s*ms/);
  if (!match) return;

  const duration = Number.parseInt(match[1], 10);
  stats.summary.durationCount++;
  stats.summary.durationTotalMs += duration;

  let bucket = "1000+";
  if (duration < 10) bucket = "0-9";
  else if (duration < 50) bucket = "10-49";
  else if (duration < 100) bucket = "50-99";
  else if (duration < 300) bucket = "100-299";
  else if (duration < 1000) bucket = "300-999";
  increment(stats.durationDistribution, bucket);
}

async function processLog(input) {
  const rl = createInterface({
    input: createReadStream(input, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let currentLimits = null;

  for await (const line of rl) {
    stats.source.lineCount++;
    if (stats.source.lineCount % 100000 === 0) {
      console.log(`已处理 ${stats.source.lineCount.toLocaleString("zh-CN")} 行...`);
    }

    const request = parseRequestLine(line);
    if (request) {
      if (currentLimits) {
        stats.quality.requestsMissingLimitBlock++;
      }
      recordRequest(request);
      currentLimits = {};
      continue;
    }

    if (currentLimits) {
      for (const field of LIMIT_FIELDS) {
        const value = parseLimitValue(line, field);
        if (value !== undefined) {
          currentLimits[field] = value;
        }
      }

      if (Object.hasOwn(currentLimits, "sanityLimit")) {
        increment(stats.limitCombinations, getLimitKey(currentLimits));
        stats.quality.parsedLimitBlocks++;
        currentLimits = null;
      }
    }

    if (line.includes("Rate limit check for IP:")) {
      const ipMatch = line.match(/Rate limit check for IP:\s*(.+)/);
      if (ipMatch) uniqueIPs.add(ipMatch[1].trim());
    }

    if (line.includes("Cache miss")) stats.summary.cacheMisses++;
    if (line.includes("Result stored in cache")) stats.summary.cacheStores++;
    if (line.includes("Calculation resulted in empty")) stats.summary.emptyResults++;
    if (line.includes("后端计算完成, 耗时:")) recordDuration(line);
  }

  if (currentLimits) {
    stats.quality.requestsMissingLimitBlock++;
  }
}

function finalize(input) {
  stats.source.input = input;
  stats.source.generatedAt = new Date().toISOString();
  stats.summary.uniqueIPs = uniqueIPs.size;
  stats.summary.averageDurationMs = stats.summary.durationCount > 0
    ? Number((stats.summary.durationTotalMs / stats.summary.durationCount).toFixed(2))
    : 0;

  if (timestamps.length > 0) {
    timestamps.sort((a, b) => a.getTime() - b.getTime());
    const first = timestamps[0];
    const last = timestamps[timestamps.length - 1];
    stats.summary.firstTimestamp = toShanghaiISOString(first);
    stats.summary.lastTimestamp = toShanghaiISOString(last);
    const activeDays = new Set(timestamps.map((date) => formatDateParts(date).day));
    stats.summary.activeDays = activeDays.size;
    stats.summary.avgDailyTimestampedRequests = Number((stats.summary.timestampedRequests / activeDays.size).toFixed(2));
  }
}

function toShanghaiISOString(date) {
  const { day, hour } = formatDateParts(date);
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${day}T${hour}:${parts.minute}:${parts.second}+08:00`;
}

function topEntries(map, limit = 20) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "zh-CN"))
    .slice(0, limit);
}

function sortedEntries(map) {
  return Object.entries(map).sort((a, b) => String(a[0]).localeCompare(String(b[0]), "zh-CN"));
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function formatPercent(count, total) {
  if (!total) return "0.00%";
  return `${((count / total) * 100).toFixed(2)}%`;
}

function appendTopSection(lines, title, map, limit, total = stats.summary.totalRequests, labelFormatter = defaultLabelFormatter) {
  lines.push("", title, "-".repeat(50));
  for (const [key, count] of topEntries(map, limit)) {
    lines.push(`${labelFormatter(key)}: ${formatNumber(count)} (${formatPercent(count, total)})`);
  }
}

function defaultLabelFormatter(key) {
  return key;
}

function targetBucketLabel(bucket) {
  const start = Number.parseInt(bucket, 10);
  return `[${start}, ${start + 99}]`;
}

function generateReport() {
  const lines = [
    "旧版日志分析报告",
    "==================",
    `分析时间: ${new Date().toLocaleString("zh-CN", { hour12: false })}`,
    `日志文件: ${stats.source.input}`,
    `总行数: ${formatNumber(stats.source.lineCount)}`,
    "",
    "总体统计",
    "-----------",
    `总请求数: ${formatNumber(stats.summary.totalRequests)}`,
    `带时间戳请求: ${formatNumber(stats.summary.timestampedRequests)}`,
    `无时间戳请求: ${formatNumber(stats.summary.undatedRequests)}`,
    `Goal格式请求: ${formatNumber(stats.summary.goalRequests)}`,
    `独立IP数: ${formatNumber(stats.summary.uniqueIPs)}`,
    `空结果数: ${formatNumber(stats.summary.emptyResults)}`,
    `可统计趋势范围: ${stats.summary.firstTimestamp || "--"} 至 ${stats.summary.lastTimestamp || "--"}`,
    `有请求日期数: ${formatNumber(stats.summary.activeDays)}`,
    `带时间戳日均请求: ${stats.summary.avgDailyTimestampedRequests}`,
    "",
    "请求格式",
    "-----------",
    `Goal新格式: ${formatNumber(stats.requestFormats.goal)}`,
    `带时间戳Validated格式: ${formatNumber(stats.requestFormats.timestampedValidated)}`,
    `无时间戳Validated格式: ${formatNumber(stats.requestFormats.untimestampedValidated)}`,
    "",
    "缓存统计",
    "-----------",
    `Cache Miss: ${formatNumber(stats.summary.cacheMisses)}`,
    `Result Stored: ${formatNumber(stats.summary.cacheStores)}`,
    "说明: 旧日志未稳定记录直接命中缓存事件；Result Stored 更接近 miss 后写入缓存，不等同于 cache hit。",
  ];

  appendTopSection(lines, "Target值分布 Top 20", stats.targetDistribution, 20, stats.summary.totalRequests, targetBucketLabel);
  appendTopSection(lines, "限制组合频率 Top 20", stats.limitCombinations, 20);
  appendTopSection(lines, "Goal精确值 Top 20", stats.exactGoalDistribution, 20, stats.summary.goalRequests || stats.summary.totalRequests);
  appendTopSection(lines, "Items Length分布 Top 20", stats.itemsLengthDistribution, 20);

  lines.push("", "小时分布", "-".repeat(50));
  for (const [hour, count] of sortedEntries(stats.timeDistribution)) {
    lines.push(`${hour}:00: ${formatNumber(count)} (${formatPercent(count, stats.summary.timestampedRequests)})`);
  }

  appendTopSection(lines, "日分布 Top 30", stats.dayDistribution, 30, stats.summary.timestampedRequests);
  appendTopSection(lines, "周分布 Top 30", stats.weekDistribution, 30, stats.summary.timestampedRequests);

  lines.push("", "月分布", "-".repeat(50));
  for (const [month, count] of sortedEntries(stats.monthDistribution)) {
    lines.push(`${month}: ${formatNumber(count)} (${formatPercent(count, stats.summary.timestampedRequests)})`);
  }

  lines.push("", "特殊数字命中", "-".repeat(50));
  for (const [key, count] of Object.entries(stats.specialNumberHits)) {
    lines.push(`${key}: ${formatNumber(count)} (${formatPercent(count, stats.summary.goalRequests)})`);
  }

  lines.push("", "数据质量提示", "-".repeat(50));
  lines.push(`Limit块成功解析: ${formatNumber(stats.quality.parsedLimitBlocks)}`);
  lines.push(`疑似缺失Limit块请求: ${formatNumber(stats.quality.requestsMissingLimitBlock)}`);
  lines.push(`时间戳解析失败: ${formatNumber(stats.quality.timestampParseFailures)}`);
  lines.push(`旧版内部耗时样本: 平均 ${stats.summary.averageDurationMs} ms（样本 ${formatNumber(stats.summary.durationCount)} 条，仅供参考）`);
  lines.push("说明: 旧日志中的“后端计算完成, 耗时”几乎全部为 0/1 ms，更像局部内部耗时，不代表用户体感等待时间。");
  lines.push("注意: 日/周/月趋势只统计带时间戳请求，无时间戳旧记录只进入总体与分布统计。");

  return `${lines.join("\n")}\n`;
}

function buildOutputData() {
  return {
    ...stats,
    top: {
      targetDistribution: topEntries(stats.targetDistribution, 50),
      exactTargetDistribution: topEntries(stats.exactTargetDistribution, 50),
      limitCombinations: topEntries(stats.limitCombinations, 50),
      exactGoalDistribution: topEntries(stats.exactGoalDistribution, 50),
      itemsLengthDistribution: topEntries(stats.itemsLengthDistribution, 50),
      dayDistribution: topEntries(stats.dayDistribution, 60),
      weekDistribution: topEntries(stats.weekDistribution, 60),
    },
    series: {
      byHour: sortedEntries(stats.timeDistribution).map(([key, count]) => ({ key, count })),
      byDay: sortedEntries(stats.dayDistribution).map(([key, count]) => ({ key, count })),
      byWeek: sortedEntries(stats.weekDistribution).map(([key, count]) => ({ key, count })),
      byMonth: sortedEntries(stats.monthDistribution).map(([key, count]) => ({ key, count })),
    },
  };
}

function buildFrontendStats() {
  return {
    version: 1,
    source: {
      kind: "legacy-node-log",
      inputName: stats.source.input.split(/[\\/]/).pop(),
      generatedAt: stats.source.generatedAt,
      firstTimestamp: stats.summary.firstTimestamp,
      lastTimestamp: stats.summary.lastTimestamp,
      note: "趋势序列只包含旧日志中带时间戳的请求；总量包含早期无时间戳请求。",
    },
    summary: {
      totalRequests: stats.summary.totalRequests,
      timestampedRequests: stats.summary.timestampedRequests,
      undatedRequests: stats.summary.undatedRequests,
      goalRequests: stats.summary.goalRequests,
      uniqueIPs: stats.summary.uniqueIPs,
      emptyResults: stats.summary.emptyResults,
      activeDays: stats.summary.activeDays,
      avgDailyTimestampedRequests: stats.summary.avgDailyTimestampedRequests,
    },
    series: {
      byHourOfDay: sortedEntries(stats.timeDistribution).map(([key, count]) => ({ key, label: `${key}:00`, count })),
      byDay: sortedEntries(stats.dayDistribution).map(([key, count]) => ({ key, label: key.slice(5), count })),
      byWeek: sortedEntries(stats.weekDistribution).map(([key, count]) => ({ key, label: key, count })),
      byMonth: sortedEntries(stats.monthDistribution).map(([key, count]) => ({ key, label: key, count })),
    },
    distributions: {
      topTargets: topEntries(stats.targetDistribution, 20).map(([key, count]) => ({ key, count })),
      topGoals: topEntries(stats.exactGoalDistribution, 20).map(([key, count]) => ({ key, count })),
      topLimitCombinations: topEntries(stats.limitCombinations, 20).map(([key, count]) => ({ key, count })),
      specialNumberHits: stats.specialNumberHits,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.input)) {
    throw new Error(`找不到日志文件: ${args.input}`);
  }
  mkdirSync(args.outDir, { recursive: true });

  await processLog(args.input);
  finalize(args.input);

  const reportPath = resolve(args.outDir, args.reportName);
  const dataPath = resolve(args.outDir, args.dataName);
  const frontendDataPath = args.frontendData;
  writeFileSync(reportPath, generateReport(), "utf8");
  writeFileSync(dataPath, `${JSON.stringify(buildOutputData(), null, 2)}\n`, "utf8");
  mkdirSync(dirname(frontendDataPath), { recursive: true });
  writeFileSync(frontendDataPath, `${JSON.stringify(buildFrontendStats(), null, 2)}\n`, "utf8");

  console.log(`\n分析完成`);
  console.log(`报告: ${reportPath}`);
  console.log(`数据: ${dataPath}`);
  console.log(`前端基线数据: ${frontendDataPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
