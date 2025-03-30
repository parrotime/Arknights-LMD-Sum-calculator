// webpack.config.js
const path = require("path");

module.exports = {
  entry: "./src/index.js", // 你的主入口文件
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader", // 可选，如果需要支持现代 JS
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      {
        test: /worker\.js$/,
        use: {
          loader: "worker-loader",
          options: {
            inline: "no-fallback", // 将 Worker 打包为内联 Blob
          },
        },
      },
      {
        // 匹配所有 .css 文件
        test: /\.css$/,
        // 使用 style-loader 和 css-loader 处理 CSS 文件
        use: ["style-loader", "css-loader"],
      },
      {
        // 匹配所有 .webp 文件
        test: /\.webp$/,
        type: "asset/resource",
        generator: {
          filename: "images/[name][ext]",
        },
      },
    ],
  },
  resolve: {
    extensions: [".js"],
  },
  mode: "development", // 或 "production"
};
