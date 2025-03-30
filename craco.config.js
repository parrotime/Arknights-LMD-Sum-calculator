module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.module.rules.push({
        test: /worker\.js$/,
        use: { loader: "worker-loader" },
      });
      return webpackConfig;
    },
  },
};
