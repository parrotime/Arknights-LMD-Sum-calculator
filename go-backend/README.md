# Go 后端迁移起步版

这个目录是新的 Golang 后端旁路工程，不替换、不删除现有 `backend/` 目录。

## 当前目标

- 保持 `/find-paths` 请求和响应结构兼容现有前端与 `test-plan`。
- 启动时从 `../data/gameItems.json` 读取游戏数据。
- 在 Go 中复刻当前 `DPnew.js` 的主要计算规则。
- 使用本地内存缓存、限流和并发控制，适配 2 vCPU / 2 GiB 的云服务器。

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
