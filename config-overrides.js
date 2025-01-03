const path = require('path');

module.exports = function override(config, env) {
  // Add WebAssembly support
  config.experiments = {
    ...config.experiments,
    asyncWebAssembly: true,
  };

  // Add WASM MIME type
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'webassembly/async',
  });

  // Add resolve fallback for node modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    fs: false,
    path: false,
  };

  return config;
};