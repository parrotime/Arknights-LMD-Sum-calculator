module.exports = {
  apps: [{
    name: "ark-lmd-backend",
    script: "server.js",
    instances: 1,
    exec_mode: "fork",
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
    max_memory_restart: "300M",
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    merge_logs: true,
  }],
};
