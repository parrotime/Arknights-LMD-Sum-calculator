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
