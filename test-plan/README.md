# 后端测试脚本说明

本目录用于对比现有 JS 后端和后续 Go 后端。

## 常用命令

建议用测试模式启动 JS 后端，避免本地功能测试触发 15 次/分钟的生产限流：

```powershell
$env:NODE_ENV="test"
$env:PORT="3002"
cd backend
node server.js
```

如果需要按“本地 2 核口径”启动 JS 后端，可以使用辅助脚本：

```powershell
powershell -ExecutionPolicy Bypass -File test-plan/scripts/start-js-2core.ps1
```

默认行为：

```text
NODE_ENV=test
PORT=3002
WORKER_POOL_SIZE=1
ProcessorAffinity=3
```

其中 `ProcessorAffinity=3` 表示把后端进程尽量限制在 CPU0 和 CPU1。这个脚本只用于本地测试，不用于生产部署。

功能测试：

```bash
node test-plan/scripts/run-functional.mjs --backend js --url http://127.0.0.1:3002 --mode fast
```

如果你测试的是生产模式服务，可以加 `--delay` 降低请求频率：

```bash
node test-plan/scripts/run-functional.mjs --backend js --url http://127.0.0.1:3002 --mode fast --delay 4200
```

性能测试：

```bash
node test-plan/scripts/run-benchmark.mjs --backend js --url http://127.0.0.1:3002 --mode fast --runs 5
```

并发压测：

```bash
node test-plan/scripts/run-load.mjs --backend js --url http://127.0.0.1:3002 --mode fast --concurrency 2 --duration 30
```

JS 与 Go 报告对比：

```bash
node test-plan/scripts/compare-results.mjs --base test-plan/reports/js-fast-benchmark.json --next test-plan/reports/go-fast-benchmark.json
```

## 说明

- 当前 JS 后端会忽略 `calcMode` 字段，因此脚本可以提前发送 `fast` 或 `strong`。
- 当前 JS 后端限制 `target` 范围为 `-5000 ~ 5000`。
- Go 后端应尽量保持 `/find-paths` 请求和响应结构兼容。
- 报告默认写入 `test-plan/reports/`。
- 功能、性能、并发报告会记录运行脚本所在机器的 CPU、内存、Node 版本等环境信息。
- 本地模拟 2 核时，应限制被测后端服务进程；测试脚本本身通常不需要限制 CPU。
