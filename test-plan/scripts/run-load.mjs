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
const concurrency = Number(args.concurrency || 2);
const durationSeconds = Number(args.duration || 30);
const timeoutMs = Number(args.timeout || 20000);

const cases = loadCaseFiles(["stress.cases.json"]);
const records = [];
const startedAt = Date.now();
const endAt = startedAt + durationSeconds * 1000;

let sequence = 0;
let caseIndex = 0;

async function worker(workerId) {
  while (Date.now() < endAt) {
    const testCase = cases[caseIndex % cases.length];
    caseIndex += 1;
    const requestId = ++sequence;
    const body = buildRequestBody(testCase, mode);
    const response = await postFindPaths({ url, body, timeoutMs });
    const record = {
      ...makeRecord({ backend, mode, testCase, response }),
      workerId,
      requestId
    };
    records.push(record);
    console.log(`worker=${workerId} request=${requestId} case=${testCase.name} status=${record.status} client=${record.durationMsClient}ms`);
  }
}

await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index + 1)));

const payload = {
  type: "load",
  backend,
  url,
  mode,
  concurrency,
  durationSeconds,
  createdAt: new Date().toISOString(),
  environment: collectEnvironment(),
  summary: summarizeTimings(records),
  records
};

const stamp = timestamp();
const jsonFile = path.join(REPORT_DIR, `${backend}-${mode}-load-c${concurrency}-${stamp}.json`);
const mdFile = path.join(REPORT_DIR, `${backend}-${mode}-load-c${concurrency}-${stamp}.md`);
writeJson(jsonFile, payload);
writeText(mdFile, markdownSummary("Load Test Report", payload));

console.log("");
console.log(`Report JSON: ${jsonFile}`);
console.log(`Report MD:   ${mdFile}`);
