# 旧 JS 后端隔离测试包

本目录用于在服务器维护模式下，单独测试旧版 JS 后端的计算速度与结果概况。

目标：

- 只请求服务器本机旧 JS 后端，例如 `http://127.0.0.1:3002/find-paths`。
- 不经过公网 `ark-lmd.top/find-paths`。
- 不写入生产 PM2 日志或 Go 生产 `calc-events.log`。
- 测试结果单独输出到测试报告目录。

## 目录内容

```text
deploy_for_test/
  README.md
  cases/
    js-legacy-benchmark.cases.json
  scripts/
    run-js-legacy-benchmark.mjs
```

## 适配的旧 JS 接口

旧 JS 后端请求体需要包含 `items`：

```json
{
  "target": 2500,
  "items": [],
  "userLimits": {},
  "rawGoal": 102500
}
```

新版测试用例仍然只写 `settings`。runner 会读取 `gameItems.json`，按 `settings` 自动生成旧接口需要的 `items`。

## 上传建议

建议服务器测试目录结构：

```text
/www/wwwroot/ark-lmd-test/
  js-backend/
  data/
    gameItems.json
  deploy_for_test/
    README.md
    cases/
    scripts/
```

其中：

```text
main/data/gameItems.json -> /www/wwwroot/ark-lmd-test/data/gameItems.json
main/deploy_for_test     -> /www/wwwroot/ark-lmd-test/deploy_for_test
```

## 启动旧 JS 后端

如果旧 JS 后端代码写死 `3002`，直接用 `3002`。先确认监听进程来自测试目录：

```bash
ss -lntp | grep ':3002'
readlink -f /proc/<PID>/cwd
```

期望输出：

```text
/www/wwwroot/ark-lmd-test/js-backend
```

## 运行测试

进入测试包目录：

```bash
cd /www/wwwroot/ark-lmd-test/deploy_for_test
```

先跑少量预检：

```bash
node scripts/run-js-legacy-benchmark.mjs \
  --url http://127.0.0.1:3002 \
  --items-file ../data/gameItems.json \
  --case-file cases/js-legacy-benchmark.cases.json \
  --report-dir /www/wwwlogs/ark-lmd-test/reports \
  --runs 1 \
  --groups simple
```

确认没有明显错误后，建议按分组跑旧 JS benchmark，不建议在 2核2G 服务器上一口气跑完整大样本。

建议旧 JS 测试时把客户端等待超时拉到 60 秒，便于观察复杂目标到底要算多久：

```bash
node scripts/run-js-legacy-benchmark.mjs \
  --url http://127.0.0.1:3002 \
  --items-file ../data/gameItems.json \
  --case-file cases/js-legacy-benchmark.cases.json \
  --report-dir /www/wwwlogs/ark-lmd-test/reports \
  --runs 3 \
  --timeout 60000 \
  --groups simple \
  --label simple \
  --delay 300
```

复杂组建议单独跑，并且加大请求间隔：

```bash
node scripts/run-js-legacy-benchmark.mjs \
  --url http://127.0.0.1:3002 \
  --items-file ../data/gameItems.json \
  --case-file cases/js-legacy-benchmark.cases.json \
  --report-dir /www/wwwlogs/ark-lmd-test/reports \
  --runs 3 \
  --timeout 60000 \
  --groups complex \
  --label complex \
  --delay 1000
```

设置组和限制组也建议单独跑：

```bash
node scripts/run-js-legacy-benchmark.mjs \
  --url http://127.0.0.1:3002 \
  --items-file ../data/gameItems.json \
  --case-file cases/js-legacy-benchmark.cases.json \
  --report-dir /www/wwwlogs/ark-lmd-test/reports \
  --runs 3 \
  --timeout 60000 \
  --groups settings,limited \
  --label settings-limited \
  --delay 500
```

当前用例文件共 160 个场景：

- `simple`：90 个常见目标，包含正负目标。
- `complex`：50 个不规则目标，包含正负目标。
- `settings`：10 个不同计算配置开关。
- `limited`：10 个用户输入限制。

使用 `--runs 3` 时，总请求数为：

```text
160 个场景 × 3 次 = 480 次请求
```

旧 JS 后端有缓存。同一个请求体通常第 1 次是 `cache=miss`，后续重复请求是 `cache=hit`。因此一次完整测试大约包含：

```text
160 次冷计算 + 320 次缓存命中
```

如果测试前刚跑过相同请求，缓存可能已经存在，首轮也可能直接 `cache=hit`。需要完全冷启动数据时，可以重启测试用旧 JS 后端。

2核2G服务器上建议优先采用分组测试：

- 先跑 `simple`，确认基本曲线。
- 再跑 `settings,limited`，确认用户配置和限制条件。
- 最后跑 `complex`，观察旧 JS 的复杂目标超时情况。

## 输出文件

脚本会输出三类文件：

```text
/www/wwwlogs/ark-lmd-test/reports/js-legacy-benchmark-<time>.json
/www/wwwlogs/ark-lmd-test/reports/js-legacy-benchmark-<time>.jsonl
/www/wwwlogs/ark-lmd-test/reports/js-legacy-benchmark-<time>.md
```

含义：

- `.json`：完整结构化报告，适合后续程序对比。
- `.jsonl`：一行一个请求结果，适合 `grep` / `awk` / 导入数据库。
- `.md`：人眼快速查看。

## 日志隔离说明

旧 JS 后端自己的服务日志建议继续写到：

```text
/www/wwwlogs/ark-lmd-test/js/backend-out.log
/www/wwwlogs/ark-lmd-test/js/backend-error.log
```

测试 runner 的结果写到：

```text
/www/wwwlogs/ark-lmd-test/reports/
```

这不会污染：

- `/root/.pm2/logs/backend-out.log`
- `/root/.pm2/logs/backend-error.log`
- `/var/log/ark-lmd/calc-events.log`

前提是：被测试的旧 JS 进程确实从 `/www/wwwroot/ark-lmd-test/js-backend` 启动。

## Go 后端隔离测试

Go 后端使用同一份 `cases/js-legacy-benchmark.cases.json`，保证和旧 JS 后端测试场景一致。区别是 Go 后端启动时会自己读取 `gameItems.json`，所以 Go benchmark 请求体不再传 `items`。

建议测试端口：

```text
http://127.0.0.1:3103
```

启动 Go 测试服务示例：

```bash
cd /www/wwwroot/ark-lmd-test/go-backend

nohup env \
PORT=3103 \
NODE_ENV=test \
DATA_FILE=/www/wwwroot/ark-lmd-test/data/gameItems.json \
LOG_DIR=/www/wwwlogs/ark-lmd-test/go \
LOG_LEVEL=warn \
LOG_JSON=true \
LOG_TO_STDOUT=false \
CALC_TIMEOUT_MS=60000 \
MAX_CONCURRENCY=1 \
MAX_QUEUE_SIZE=4 \
CACHE_MAX_ENTRIES=2048 \
CACHE_TTL_SECONDS=3600 \
RATE_LIMIT_PER_MINUTE=9999 \
MAINTENANCE_ENABLED=false \
./ark-lmd-go </dev/null > /www/wwwlogs/ark-lmd-test/go/backend-stdout.log 2> /www/wwwlogs/ark-lmd-test/go/backend-stderr.log &
```

预检：

```bash
ss -lntp | grep ':3103'
curl http://127.0.0.1:3103/
```

### Go fast 测试

先跑 `fast`，用于和旧 JS 后端直接对比。

少量预检：

```bash
cd /www/wwwroot/ark-lmd-test/deploy_for_test

node scripts/run-go-benchmark.mjs \
  --url http://127.0.0.1:3103 \
  --case-file cases/js-legacy-benchmark.cases.json \
  --report-dir /www/wwwlogs/ark-lmd-test/reports \
  --mode fast \
  --runs 1 \
  --groups simple \
  --label fast-precheck \
  --timeout 60000 \
  --delay 300
```

正式分组测试：

```bash
node scripts/run-go-benchmark.mjs \
  --url http://127.0.0.1:3103 \
  --case-file cases/js-legacy-benchmark.cases.json \
  --report-dir /www/wwwlogs/ark-lmd-test/reports \
  --mode fast \
  --runs 3 \
  --groups simple \
  --label fast-simple \
  --timeout 60000 \
  --delay 300
```

```bash
node scripts/run-go-benchmark.mjs \
  --url http://127.0.0.1:3103 \
  --case-file cases/js-legacy-benchmark.cases.json \
  --report-dir /www/wwwlogs/ark-lmd-test/reports \
  --mode fast \
  --runs 3 \
  --groups settings,limited \
  --label fast-settings-limited \
  --timeout 60000 \
  --delay 500
```

```bash
node scripts/run-go-benchmark.mjs \
  --url http://127.0.0.1:3103 \
  --case-file cases/js-legacy-benchmark.cases.json \
  --report-dir /www/wwwlogs/ark-lmd-test/reports \
  --mode fast \
  --runs 3 \
  --groups complex \
  --label fast-complex \
  --timeout 60000 \
  --delay 1000
```

### Go strong 测试

`strong` 使用同一份用例，命令只需要把 `--mode fast` 改成 `--mode strong`，并把 label 改成 `strong-*`。

示例：

```bash
node scripts/run-go-benchmark.mjs \
  --url http://127.0.0.1:3103 \
  --case-file cases/js-legacy-benchmark.cases.json \
  --report-dir /www/wwwlogs/ark-lmd-test/reports \
  --mode strong \
  --runs 3 \
  --groups simple \
  --label strong-simple \
  --timeout 60000 \
  --delay 300
```

Go 后端也有进程内 LRU 缓存。同一组测试如果要观察完整冷计算，建议测试前重启 Go 测试服务。若不重启，后续重复请求可能直接 `cache=hit`。

Go benchmark 输出文件示例：

```text
/www/wwwlogs/ark-lmd-test/reports/go-benchmark-fast-simple-<time>.json
/www/wwwlogs/ark-lmd-test/reports/go-benchmark-fast-simple-<time>.jsonl
/www/wwwlogs/ark-lmd-test/reports/go-benchmark-fast-simple-<time>.md
```
