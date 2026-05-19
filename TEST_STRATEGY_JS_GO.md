# JS 与 Go 后端性能统计测试方案

本文档用于规划 `ark-lmd.top` 后端从现有 JS 计算服务迁移到 Go 后端时的测试体系。目标不是只证明“Go 更快”，而是用同一批用例、同一套统计口径，对比优化前后的正确性、答案质量、接口表现和并发稳定性。

## 1. 测试目标

本次测试体系覆盖四类问题：

1. 正确性：每条返回路径的龙门币总和必须等于 `target`。
2. 规则一致性：用户设置、数量限制、贸易站赤金限制、劣质路径过滤必须生效。
3. 答案质量：统计返回路径数量、最短步骤数、平均步骤数，并检查关键方案是否保留。
4. 性能表现：统计 JS 与 Go 在相同输入下的耗时、超时率、错误率、缓存命中率和并发表现。

## 2. 测试层级

### 2.1 算法直测

JS 侧直接测试 `backend/DPnew.js` 的 `findPaths()`。

Go 侧后续直接测试内部计算包，例如 `calc.FindPaths()`。

这一层用于确认算法本身的性能，不包含 HTTP、JSON、缓存、队列、日志等开销。

### 2.2 HTTP 接口测试

统一请求：

```http
POST /find-paths
Content-Type: application/json
```

推荐本地端口：

```text
JS: http://127.0.0.1:3002
Go: http://127.0.0.1:3003
```

正式对比以 HTTP 接口测试为主，因为它最接近真实用户访问。

### 2.3 并发压测

在服务器配置为 2 vCPU / 2 GiB 的前提下，重点测试：

```text
concurrency = 1 / 2 / 5 / 10
```

重点观察：

- P95 响应时间
- 超时率
- 错误率
- 503 队列繁忙比例
- 504 计算超时比例
- CPU 被打满时是否仍能稳定返回错误

## 3. 用例目录

新增目录：

```text
test-plan/
  README.md
  cases/
    correctness.cases.json
    trade-limits.cases.json
    quality.cases.json
    performance.cases.json
    stress.cases.json
  scripts/
    shared.mjs
    run-functional.mjs
    run-benchmark.mjs
    run-load.mjs
    compare-results.mjs
  reports/
```

## 4. 用例分类

### 4.1 正确性用例

覆盖典型正负目标、边界目标和不规则目标：

```text
100
-200
500
-500
2500
5000
-5000
71
137
971
4999
```

验收标准：

- HTTP 200。
- `success=true`。
- `paths` 是数组。
- 每条路径总和等于 `target`。

### 4.2 赤金限制用例

重点覆盖新增的 2/3/4/5 赤金订单数限制：

```text
target=2500，默认限制：
必须包含 222x1。
必须包含 117x1_118x1。

target=2500，trade5Limit=0：
不得包含 222x1。
必须仍包含 117x1_118x1。

target=2500，trade2Limit=0 且 trade3Limit=0：
不得包含 117x1_118x1。
```

### 4.3 劣质路径过滤用例

例如：

```text
+500 +2500 -500 = 2500
```

这种路径虽然总和正确，但正负抵消步骤可以直接删除，对用户没有价值。测试脚本会检查返回路径里是否存在可删除的零和子集。

### 4.4 性能用例

性能用例要同时包含容易、普通、困难目标：

```text
1
10
50
100
500
1000
1500
2500
3000
4000
5000
71
137
293
971
1847
3764
4999
-100
-500
-2000
-5000
```

后续 Go 的 `strong` 模式可以扩展到：

```text
6000
7000
8000
```

注意：当前 JS 后端仍限制 `target` 为 `-5000 ~ 5000`。

## 5. 统计指标

每次请求记录：

```text
backend
url
caseName
target
calcMode
status
success
cache
durationMsClient
durationMsServer
pathCount
minStepTypes
avgStepTypes
minOperationCount
avgOperationCount
error
```

汇总统计：

```text
count
ok
failed
errorRate
timeoutRate
cacheHitRate
avg
p50
p90
p95
p99
min
max
```

## 6. 缓存测试口径

性能测试必须区分冷缓存和热缓存：

```text
cold：同一用例第一次请求，主要测试真实计算成本。
warm：同一用例第二次请求，主要测试缓存与接口成本。
```

现有 JS 后端返回：

```json
{
  "cache": "hit"
}
```

Go 后端也应保持这个字段。

正式报告应分开展示：

```text
JS cold vs Go cold
JS warm vs Go warm
```

## 7. 结果一致性策略

Go 版不需要和 JS 版逐条路径完全相同。迁移后允许算法实现变化，但必须满足：

1. 每条路径总和正确。
2. 用户限制条件严格生效。
3. 不出现已知劣质路径。
4. 关键方案不丢失，例如 `target=2500` 同时保留 `222x1` 和 `117x1_118x1`。
5. 答案质量不明显退化，例如路径数量、最短步骤、平均步骤不能显著差于 JS 当前版。

## 8. 推荐执行顺序

先用测试模式启动当前 JS 后端，避免本地功能测试触发生产限流：

```powershell
$env:NODE_ENV="test"
$env:PORT="3002"
cd backend
node server.js
```

运行功能测试：

```bash
node test-plan/scripts/run-functional.mjs --backend js --url http://127.0.0.1:3002 --mode fast
```

如果测试的是生产模式服务，可以加请求间隔，避免限流影响功能判断：

```bash
node test-plan/scripts/run-functional.mjs --backend js --url http://127.0.0.1:3002 --mode fast --delay 4200
```

运行性能测试：

```bash
node test-plan/scripts/run-benchmark.mjs --backend js --url http://127.0.0.1:3002 --mode fast --runs 5
```

Go 后端完成后，启动 Go 服务并运行同样脚本：

```bash
node test-plan/scripts/run-functional.mjs --backend go --url http://127.0.0.1:3003 --mode fast
node test-plan/scripts/run-benchmark.mjs --backend go --url http://127.0.0.1:3003 --mode fast --runs 5
```

对比报告：

```bash
node test-plan/scripts/compare-results.mjs --base test-plan/reports/js-fast-benchmark.json --next test-plan/reports/go-fast-benchmark.json
```

## 9. 测试环境共识

本地机器和阿里云服务器性能差距较大，因此测试结果需要分场景理解。

本地测试主要用于：

- 验证功能正确性。
- 验证 JS 与 Go 的相对性能趋势。
- 验证 benchmark 脚本和报告流程。
- 初步观察 fast / strong 两种模式的质量和耗时差异。

本地测试不能直接代表线上真实表现，尤其不能直接等价为 2 vCPU / 2 GiB 服务器上的 P95、P99 和并发稳定性。

### 9.1 本地模拟 2 核

本地测试时，限制“测试脚本”意义不大，真正应该限制的是被测后端服务进程。

JS 后端建议：

```powershell
$env:NODE_ENV="test"
$env:WORKER_POOL_SIZE="1"
$env:PORT="3002"
cd backend
node server.js
```

说明：

- `NODE_ENV=test`：关闭接口限流，避免测试结果被 429 污染。
- `WORKER_POOL_SIZE=1`：更接近 2 核服务器上的保守配置，给 HTTP 主线程、JSON 解析、日志和系统进程留出空间。

Go 后端建议：

```powershell
$env:GOMAXPROCS="2"
$env:PORT="3003"
```

`GOMAXPROCS=2` 用于限制 Go 同时执行 Go 代码的 CPU 线程数，更接近 2 vCPU 环境。

如果需要更强的本地 CPU 限制，可以用 Windows 进程亲和性把后端进程固定到前两个逻辑 CPU：

```powershell
$p = Start-Process node -ArgumentList "server.js" -WorkingDirectory "backend" -PassThru
$p.ProcessorAffinity = 3
```

其中 `3` 表示只允许进程使用 CPU0 和 CPU1。Go 后端也可以用相同方式启动。

### 9.2 测试脚本不建议限制 2 核

测试脚本本身不建议限制到 2 核。真实线上环境中，用户请求来自外部，不会和后端服务进程运行在同一台客户端机器上。

本地测试时更合理的口径是：

```text
后端服务：限制到 2 核。
测试脚本：不限制，尽量减少对被测后端的干扰。
```

如果把测试脚本和后端都限制在同两个核上，测试结果可能比真实线上更差，反而不利于判断后端本身的性能。

### 9.3 内存评估

当前阶段内存不是第一优先级瓶颈，CPU 更关键。现有算法主要压力来自：

- 组合搜索。
- 路径复制。
- Map / Set 去重。
- normalize。
- 排序和筛选。

Go 迁移后通常会带来更低、更可控的内存占用，但 2 GiB 服务器仍然需要关注：

- strong 模式是否产生过多中间路径。
- 服务端缓存是否设置容量上限。
- 并发请求是否导致内存峰值过高。
- Go GC 是否频繁触发。

因此现阶段不强制在本地模拟 2 GiB 内存，但 benchmark 报告后续可以加入 RSS / heap 指标。上线前仍建议在阿里云低峰期做短时间旁路测试。

### 9.4 云服务器测试原则

暂时不把新开同规格 ECS 作为首要方案，因为会增加成本和操作复杂度。但不排除后续在上线前临时开一台同规格机器做最终验证。

如果直接在现有阿里云服务器测试，必须避免影响线上网站：

- 不压生产域名入口。
- 不直接压当前线上后端端口。
- 优先启动旁路测试端口，例如 `127.0.0.1:3003` 或 `127.0.0.1:3004`。
- 在服务器本机通过 `127.0.0.1` 跑脚本，避免占用 3Mbps 公网带宽。
- 从并发 1、2 开始，谨慎测试并发 5。
- strong 模式只做短时间、低并发测试。
- 尽量选择低峰期执行。

推荐路线：

```text
1. 本地完整功能测试。
2. 本地限制后端 2 核做初步 benchmark。
3. Go 后端完成后，本地对比 JS / Go。
4. 阿里云低峰期旁路短测。
5. 上线后只做少量真实请求观察，不做大压测。
```

## 10. 判定建议

在当前服务器规格下，建议初期目标为：

```text
fast 模式：
P95 明显低于 JS 当前版。
并发 2 时不明显排队。
并发 5 时允许部分排队，但不应大量 504。

strong 模式：
单并发优先保证质量。
并发建议限制为 1。
超时率应低于 JS 当前版。
```

如果 Go 版只做等价迁移，预期提升可先按 `2x ~ 5x` 观察。如果同时优化搜索结构和缓存策略，再评估是否达到 `5x ~ 20x`。

## 11. Go fast v1 算法基线记录

当前 Go 后端的 `internal/calc/dp.go` 暂定为 `fast v1` 算法基线，用于承接前端“快速计算模式”。

这个基线的目标不是继续追求极限性能，而是在结果质量、规则正确性、可维护性和响应速度之间取得稳定平衡。后续如果继续大幅优化 DP，不建议在 v1 上零散堆叠复杂微优化，应单独设计 `DP v2`。

fast v1 已确认保留的关键行为：

- `target=2500` 默认配置下，同时保留 `222x1` 和 `117x1+118x1`。
- `trade2Limit` / `trade3Limit` / `trade4Limit` / `trade5Limit` 生效。
- 明显可删除的正负抵消路径会被过滤。
- 正目标与负目标都作为重要场景纳入 benchmark。
- `fast` 模式优先稳定响应，`strong` 模式后续再单独提高答案质量和搜索上限。

## 12. Go benchmark 记录规范

Go 算法直测从 `go-backend` 目录执行：

```powershell
go test ./...
go test ./internal/calc -run ^$ -bench BenchmarkFindPaths -benchmem -benchtime=1s -count=1
```

重点场景建议单独跑 3 次，减少单次噪声：

```powershell
go test ./internal/calc -run ^$ -bench "BenchmarkFindPaths/target_spectrum/negative_5000_default" -benchmem -benchtime=3s -count=3
go test ./internal/calc -run ^$ -bench "BenchmarkFindPaths/limit_pressure/positive_2500_no_trade" -benchmem -benchtime=3s -count=3
```

每次记录至少包含：

```text
日期
Git diff 摘要
Go 版本
CPU / 操作系统
benchmark 命令
ns/op
B/op
allocs/op
是否通过 go test ./...
人工结论：保留 / 回退 / 继续观察
```

建议重点观察：

- 默认正目标：`positive_2500_default`、`positive_5000_default`
- 默认负目标：`negative_2500_default`、`negative_5000_default`
- 限制压力：`positive_2500_no_trade`、`positive_8000_no_trade`
- 综合限制：`positive_8000_tight_all`

## 13. pprof 记录与归档规范

pprof 用于定位热点，不作为日常必须执行项。只有在算法改动后出现明显性能波动，或准备进入新一轮优化时再生成。

生成示例：

```powershell
New-Item -ItemType Directory -Force profiles
go test ./internal/calc -run ^$ -bench "BenchmarkFindPaths/target_spectrum/negative_5000_default" -benchmem -benchtime=5s -count=1 -cpuprofile profiles\dp_cpu_negative_5000_v1.out -memprofile profiles\dp_mem_negative_5000_v1.out
go tool pprof -top profiles\dp_cpu_negative_5000_v1.out
go tool pprof -top -alloc_space profiles\dp_mem_negative_5000_v1.out
```

`go-backend/profiles/*.out` 属于本地性能分析产物，不建议提交到仓库。需要保留历史证据时，建议移动到单独归档目录，例如：

```text
archive/
  profiles/
    go-fast-v1-2026-05-19/
      README.md
      dp_cpu_negative_5000_v1.out
      dp_mem_negative_5000_v1.out
      benchmark-summary.md
```

当前 `go-backend/profiles` 中的历史文件主要是算法优化过程中的阶段性 pprof。建议只归档最终 v1 基线和少量关键对照，其余文件可以视为临时产物清理。
