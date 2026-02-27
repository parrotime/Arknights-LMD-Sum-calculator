/**
 * DPnew 基准测试 — 对比三个版本的计算速度与质量
 * 用法: node backend/_benchmark.mjs
 */
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER = path.join(__dirname, "_bench_worker.mjs");
const RUNS = 3; // 每个用例跑 3 次取中位数
const TIMEOUT = 15_000; // 单次超时 15s

// ── 版本定义 ──────────────────────────────────
const VERSIONS = [
  { name: "original ", file: "./DPnew.backup.js" },
  { name: "optimized", file: "./DPnew.backup2.js" },
  { name: "current  ", file: "./DPnew.js" },
];

// ── 测试用例 ──────────────────────────────────
const TARGETS = {
  "极小值": [1, -1, 10, -10],
  "小值":   [50, -50, 100, -100],
  "中值":   [500, -500, 1000, -1000],
  "大值":   [2000, -2000, 3000, -3000, 5000, -5000],
  "整数特殊值": [72, 200, 1500],
  "不规则值": [71, 137, 293, 971, 1847, 3764, -173, -997, -2713, -4391],
};

const LIMIT_PROFILES = [
  { name: "无限制", limits: {} },
  { name: "禁理智", limits: { sanityLimit: 0 } },
  { name: "理智≤36", limits: { sanityLimit: 36 } },
  { name: "禁升级", limits: { upgrade0Limit: 0, upgrade1Limit: 0, upgrade2Limit: 0 } },
];

// ── 工具函数 ──────────────────────────────────
function runWorker(versionFile, target, limits) {
  return new Promise((resolve) => {
    const args = [
      WORKER, versionFile,
      String(target), String(RUNS),
      JSON.stringify(limits),
    ];
    execFile("node", args, { timeout: TIMEOUT, cwd: __dirname }, (err, stdout) => {
      if (err) {
        resolve({ time: "TIMEOUT", pathCount: "—", minTypes: "—", avgTypes: "—", avgItems: "—" });
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve({ time: "ERR", pathCount: "—", minTypes: "—", avgTypes: "—", avgItems: "—" });
      }
    });
  });
}

// ── 输出收集 ─────────────────────────────────
const lines = [];
function log(text = "") {
  console.log(text);
  lines.push(text);
}

function pad(s, w) { return String(s).padStart(w); }

function printTable(rows) {
  log("版本       | 耗时(ms) | 路径数 | 最短种类 | 平均种类 | 平均总数");
  log("-----------|----------|--------|----------|----------|--------");
  for (const r of rows) {
    log(
      `${r.name} | ${pad(r.time, 8)} | ${pad(r.pathCount, 6)} | ${pad(r.minTypes, 8)} | ${pad(r.avgTypes, 8)} | ${pad(r.avgItems, 6)}`
    );
  }
}

// ── 主流程 ────────────────────────────────────
async function main() {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const outFile = path.join(__dirname, `_bench_result_${timestamp}.txt`);

  log("=".repeat(70));
  log("  DPnew 基准测试");
  log("  版本: original(备份1) / optimized(备份2) / current(当前)");
  log(`  每个用例跑 ${RUNS} 次取中位数`);
  log(`  时间: ${new Date().toLocaleString()}`);
  log("=".repeat(70));

  for (const profile of LIMIT_PROFILES) {
    log(`\n${"─".repeat(70)}`);
    log(`  限制条件: ${profile.name}`);
    log(`${"─".repeat(70)}`);

    for (const [group, targets] of Object.entries(TARGETS)) {
      for (const target of targets) {
        log(`\n  target=${target}  (${group})`);
        const rows = [];
        for (const ver of VERSIONS) {
          const result = await runWorker(ver.file, target, profile.limits);
          rows.push({ name: ver.name, ...result });
        }
        printTable(rows);
      }
    }
  }

  log("\n" + "=".repeat(70));
  log("  基准测试完成");
  log("=".repeat(70));

  // 写入文件
  fs.writeFileSync(outFile, lines.join("\n"), "utf-8");
  console.log(`\n结果已保存到: ${outFile}`);
}

main();
