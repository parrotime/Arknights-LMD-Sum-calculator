# Go 后端迁移起步版

这个目录是新的 Golang 后端旁路工程，不替换、不删除现有 `backend/` 目录。

## 当前目标

- 保持 `/find-paths` 请求和响应结构兼容现有前端与 `test-plan`。
- 启动时从 `../data/gameItems.json` 读取游戏数据。
- 在 Go 中复刻当前 `DPnew.js` 的主要计算规则。
- 使用本地内存缓存、限流和并发控制，适配 2 vCPU / 2 GiB 的云服务器。

## 当前算法基线

当前 `internal/calc/dp.go` 暂定为 `fast v1` 算法基线。

这个版本已经完成以下稳定化工作：

- 保留 `target=2500` 下 `222x1` 和 `117x1+118x1` 两类赤金方案。
- 支持 `trade2Limit` / `trade3Limit` / `trade4Limit` / `trade5Limit` 用户限制。
- 保留可删除零和子集过滤，避免明显劣质路径。
- 对 `snapshotEntries`、`savePath`、`insertPathByLength`、`mergeSingleStep`、`canMergePath` 等热点做过低风险优化。

后续不要在这个版本上继续做零散高风险微优化。若需要显著提升算法上限，建议另开 `DP v2` 设计，重点考虑路径元数据、延迟合并和状态结构重构。

## 本地运行

需要先安装 Go，并确保命令行可以执行 `go version`。

```powershell
cd go-backend
$env:PORT="3003"
$env:NODE_ENV="test"
go run ./cmd/server
```

默认端口是 `3003`。`NODE_ENV=test` 时会关闭接口限流，便于和现有测试脚本对跑。

## 缓存策略

Go 后端使用进程内 `TTL + LRU` 结果缓存。缓存 key 会包含 `target`、计算配置、用户限制、计算模式和数据版本，避免不同输入复用错误结果。

默认配置：

```text
CACHE_TTL_SECONDS=3600
CACHE_MAX_ENTRIES=1024
```

命中缓存时 `/find-paths` 会返回 `cache: "hit"`；未命中并完成计算时返回 `cache: "miss"`。当前只缓存非空结果，空结果暂不缓存。

可通过只读接口查看缓存状态：

```powershell
$headers = @{ "X-Admin-Token" = $env:ADMIN_TOKEN }
Invoke-RestMethod http://127.0.0.1:3003/cache-stats -Headers $headers
```

关注指标：

- `entries`：当前缓存条目数。
- `hits` / `misses` / `hitRate`：缓存是否有效减轻重复计算。
- `expired`：TTL 过期清理数量。
- `evictions`：容量满后 LRU 淘汰数量。

## 并发、队列与超时保护

Go 后端在缓存未命中后才进入计算保护流程：

1. 先进入等待队列。
2. 再等待计算并发名额。
3. 拿到名额后执行 DP 计算。

默认配置适合 2 vCPU / 2 GiB 的单实例服务器：

```text
MAX_CONCURRENCY=runtime.GOMAXPROCS(0)
MAX_QUEUE_SIZE=MAX_CONCURRENCY*2
CALC_TIMEOUT_MS=15000
RATE_LIMIT_PER_MINUTE=15
```

在 2 核服务器上，默认约等于同时 2 个请求正在计算，最多 4 个请求等待计算。队列满时会直接返回繁忙，避免请求无限堆积。

可通过只读接口查看运行状态：

```powershell
$headers = @{ "X-Admin-Token" = $env:ADMIN_TOKEN }
Invoke-RestMethod http://127.0.0.1:3003/server-stats -Headers $headers
```

关注指标：

- `running`：当前正在执行 DP 的请求数。
- `queued`：当前等待计算名额的请求数。
- `queueRejected`：因为等待队列已满而拒绝的请求数。
- `maxConcurrency` / `maxQueueSize`：当前并发与队列上限。

## 安全配置

生产环境建议设置管理员 token：

```text
ADMIN_TOKEN=<一段足够长的随机字符串>
```

`/cache-stats` 和 `/server-stats` 只有携带 `X-Admin-Token` 或 `Authorization: Bearer <token>` 时才会返回数据。未设置 `ADMIN_TOKEN` 时，这两个接口默认返回 404。

如果 Go 后端位于 Nginx 等可信反向代理之后，可以开启：

```text
TRUST_PROXY=true
```

开启后限流会优先使用 `X-Forwarded-For` 中的真实客户端 IP。若 Go 服务直接暴露公网，不要开启该选项，避免攻击者伪造请求头绕过按 IP 限流。

Go 后端内置轻量安全响应头中间件，覆盖 Express `helmet()` 的基础 API 场景：

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

如果生产环境由 Nginx 负责 HTTPS，`Strict-Transport-Security` 建议放在 Nginx 配置中统一设置。

## 维护页状态配置

前端维护页会读取公开接口：

```text
GET /maintenance-status
```

默认不启用维护：

```text
MAINTENANCE_ENABLED=false
```

需要启用维护页倒计时时，设置：

```text
MAINTENANCE_ENABLED=true
MAINTENANCE_END_AT=2026-05-24T08:00:00+08:00
```

可选自定义文案：

```text
MAINTENANCE_MESSAGE=网页维护中...
MAINTENANCE_SUBTITLE=计算功能暂时无法使用，如有凑龙门币数字的需要，请查看下方表格
```

`MAINTENANCE_END_AT` 建议使用带时区的 RFC3339 时间。接口会同时返回 `serverTime`，前端据此校准倒计时，避免用户本机时间不准导致显示偏差。

### 本地操作流程

开启维护状态：

```powershell
cd go-backend
$env:PORT="3003"
$env:NODE_ENV="test"
$env:MAINTENANCE_ENABLED="true"
$env:MAINTENANCE_END_AT="2026-05-24T08:00:00+08:00"
go run ./cmd/server
```

关闭维护状态：

```powershell
$env:MAINTENANCE_ENABLED="false"
go run ./cmd/server
```

本地验证：

```powershell
Invoke-RestMethod http://127.0.0.1:3003/maintenance-status
```

### 生产操作流程

生产环境优先修改：

```text
go-backend/deploy/ark-lmd-go.service
```

开启维护：

```ini
Environment=MAINTENANCE_ENABLED=true
Environment=MAINTENANCE_END_AT=2026-05-24T08:00:00+08:00
```

关闭维护：

```ini
Environment=MAINTENANCE_ENABLED=false
```

修改并部署到服务器后重载服务：

```bash
sudo systemctl daemon-reload
sudo systemctl restart ark-lmd-go
sudo systemctl status ark-lmd-go
```

生产验证：

```bash
curl https://ark-lmd.top/maintenance-status
```

## 对照测试

```powershell
node ../test-plan/scripts/run-functional.mjs --backend go --url http://127.0.0.1:3003 --mode fast
```

现有 JS 后端仍可继续使用 `http://127.0.0.1:3002`。

## 下一步检查

安装 Go 后先执行：

```powershell
cd go-backend
gofmt -w .
go test ./...
```

如果单元测试通过，再启动服务并使用 `test-plan` 与 JS 后端对照。第一轮重点看结果正确性，第二轮再看性能差异。

## Benchmark 与 pprof

算法基线测试：

```powershell
go test ./internal/calc -run ^$ -bench BenchmarkFindPaths -benchmem -benchtime=1s -count=1
```

重点压力场景：

```powershell
go test ./internal/calc -run ^$ -bench "BenchmarkFindPaths/target_spectrum/negative_5000_default" -benchmem -benchtime=3s -count=3
go test ./internal/calc -run ^$ -bench "BenchmarkFindPaths/limit_pressure/positive_2500_no_trade" -benchmem -benchtime=3s -count=3
```

pprof 文件建议只作为阶段性分析产物。`profiles/*.out` 不建议提交到仓库；如果需要保留历史证据，可以移动到单独归档目录，例如 `archive/profiles/go-fast-v1-2026-05-19/`。
