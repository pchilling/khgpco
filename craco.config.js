module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        alias: {
          ...webpackConfig.resolve.alias,
          '@components': path.resolve(__dirname, 'src/components/')
        }
      };
      return webpackConfig;
    }
  }
}; 