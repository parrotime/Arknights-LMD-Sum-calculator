import path from "node:path";
import {
  REPORT_DIR,
  buildRequestBody,
  collectEnvironment,
  loadCaseFiles,
  loadItems,
  makeRecord,
  markdownSummary,
  parseArgs,
  postFindPaths,
  sleep,
  timestamp,
  validateCaseResult,
  writeJson,
  writeText
} from "./shared.mjs";

const args = parseArgs();
const backend = args.backend || "js";
const url = args.url || "http://127.0.0.1:3002";
const mode = args.mode || "fast";
const timeoutMs = Number(args.timeout || 20000);
const delayMs = Number(args.delay || 0);

const caseFiles = [
  "correctness.cases.json",
  "trade-limits.cases.json",
  "quality.cases.json"
];

const { itemMap } = loadItems();
const cases = loadCaseFiles(caseFiles);
const records = [];
const failures = [];

for (const testCase of cases) {
  if (records.length > 0 && delayMs > 0) {
    await sleep(delayMs);
  }

  const body = buildRequestBody(testCase, mode);
  const response = await postFindPaths({ url, body, timeoutMs });
  const record = makeRecord({ backend, mode, testCase, response });
  const caseFailures = validateCaseResult({ testCase, response, itemMap });
  records.push({ ...record, passed: caseFailures.length === 0 });

  if (caseFailures.length > 0) {
    failures.push({
      group: testCase.group,
      caseName: testCase.name,
      failures: caseFailures
    });
  }

  const mark = caseFailures.length === 0 ? "PASS" : "FAIL";
  console.log(`${mark} ${testCase.group}/${testCase.name} status=${response.status} client=${record.durationMsClient}ms`);
}

const createdAt = new Date().toISOString();
const summary = {
  count: records.length,
  passed: records.filter((record) => record.passed).length,
  failed: failures.length
};

const payload = {
  type: "functional",
  backend,
  url,
  mode,
  createdAt,
  environment: collectEnvironment(),
  summary,
  delayMs,
  records,
  failures
};

const stamp = timestamp();
const jsonFile = path.join(REPORT_DIR, `${backend}-${mode}-functional-${stamp}.json`);
const mdFile = path.join(REPORT_DIR, `${backend}-${mode}-functional-${stamp}.md`);
writeJson(jsonFile, payload);
writeText(mdFile, markdownSummary("Functional Test Report", payload));

console.log("");
console.log(`Report JSON: ${jsonFile}`);
console.log(`Report MD:   ${mdFile}`);

if (failures.length > 0) {
  process.exitCode = 1;
}
