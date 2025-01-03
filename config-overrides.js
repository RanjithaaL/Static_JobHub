module.exports = function override(config, env) {
    // Add WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true
    };
  
    // Add WASM MIME type
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
  
    // Add worker-loader for web workers
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader' }
    });
  
    return config;
  };