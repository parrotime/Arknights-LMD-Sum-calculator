// webpack.config.js
const path = require("path");

module.exports = {
  entry: "./src/index.js", // ���������ļ�
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
          loader: "babel-loader", // ��ѡ�������Ҫ֧���ִ� JS
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
            inline: "no-fallback", // �� Worker ���Ϊ���� Blob
          },
        },
      },
      {
        // ƥ������ .css �ļ�
        test: /\.css$/,
        // ʹ�� style-loader �� css-loader ���� CSS �ļ�
        use: ["style-loader", "css-loader"],
      },
      {
        // ƥ������ .webp �ļ�
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
  mode: "development", // �� "production"
};
