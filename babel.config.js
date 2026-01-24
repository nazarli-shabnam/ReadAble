module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      test: {
        presets: [
          ['babel-preset-expo', { jsxRuntime: 'automatic' }],
        ],
        plugins: [
          ['@babel/plugin-transform-flow-strip-types', { allowDeclareFields: true }],
        ],
      },
    },
  };
};
