# pprof profiles

本目录保留 Go `fast v1` 算法阶段最关键的 pprof 文件。

根目录保留的关键文件：

- `dp_cpu_negative_5000_default.out`
- `dp_mem_negative_5000_default.out`
- `dp_cpu_positive_2500_no_trade.out`
- `dp_mem_positive_2500_no_trade.out`
- `dp_cpu_negative_5000_after_snapshot.out`
- `dp_mem_negative_5000_after_snapshot.out`
- `dp_cpu_positive_2500_no_trade_after_snapshot.out`
- `dp_mem_positive_2500_no_trade_after_snapshot.out`

其他阶段性 `.out` 文件已移动到：

```text
other-2026-05-19/
```

说明：

- 本次只是移动整理，没有删除文件。
- `.out` 文件属于本地性能分析产物，不建议提交到正式源码仓库。
- 已在项目 `.gitignore` 中忽略 `go-backend/profiles/**/*.out`。
