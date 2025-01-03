module.exports = function override(config, env) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
  
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
  
    return config;
  }