import path from "node:path";
import {
  REPORT_DIR,
  buildRequestBody,
  collectEnvironment,
  loadCaseFiles,
  makeRecord,
  markdownSummary,
  parseArgs,
  postFindPaths,
  summarizeTimings,
  timestamp,
  writeJson,
  writeText
} from "./shared.mjs";

const args = parseArgs();
const backend = args.backend || "js";
const url = args.url || "http://127.0.0.1:3002";
const mode = args.mode || "fast";
const runs = Number(args.runs || 5);
const timeoutMs = Number(args.timeout || 20000);

const cases = loadCaseFiles(["performance.cases.json"]);
const records = [];

for (const testCase of cases) {
  for (let run = 1; run <= runs; run += 1) {
    const body = buildRequestBody(testCase, mode);
    const response = await postFindPaths({ url, body, timeoutMs });
    const record = {
      ...makeRecord({ backend, mode, testCase, response }),
      run,
      cachePhase: response.data?.cache === "hit" ? "warm" : "cold"
    };
    records.push(record);
    console.log(`${backend}/${mode} ${testCase.name} run=${run} status=${record.status} cache=${record.cache || "-"} client=${record.durationMsClient}ms`);
  }
}

const coldRecords = records.filter((record) => record.cachePhase === "cold");
const warmRecords = records.filter((record) => record.cachePhase === "warm");
const payload = {
  type: "benchmark",
  backend,
  url,
  mode,
  runs,
  createdAt: new Date().toISOString(),
  environment: collectEnvironment(),
  summary: summarizeTimings(records),
  coldSummary: summarizeTimings(coldRecords),
  warmSummary: summarizeTimings(warmRecords),
  records
};

const stamp = timestamp();
const jsonFile = path.join(REPORT_DIR, `${backend}-${mode}-benchmark-${stamp}.json`);
const mdFile = path.join(REPORT_DIR, `${backend}-${mode}-benchmark-${stamp}.md`);
writeJson(jsonFile, payload);
writeText(mdFile, markdownSummary("Benchmark Report", payload));

console.log("");
console.log(`Report JSON: ${jsonFile}`);
console.log(`Report MD:   ${mdFile}`);
