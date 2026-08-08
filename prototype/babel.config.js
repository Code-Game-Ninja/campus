module.exports = function (api) {
  api.cache(true);

  // Expo SDK 54 ships its matching preset as an Expo dependency. Prefer that
  // copy when another workspace/tool has hoisted a newer incompatible preset.
  let expoPreset = 'babel-preset-expo';
  try {
    expoPreset = require.resolve('expo/node_modules/babel-preset-expo');
  } catch {
    // A clean install may dedupe the SDK-matched preset to the project root.
  }

  return {
    presets: [expoPreset],
    plugins: [
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-private-methods', { loose: true }],
      ['@babel/plugin-transform-private-property-in-object', { loose: true }],
      function () {
        return {
          visitor: {
            MetaProperty(path) {
              if (path.node.meta && path.node.meta.name === 'import' && path.node.property && path.node.property.name === 'meta') {
                path.replaceWithSourceString('({ env: { MODE: "development", DEV: true, PROD: false } })');
              }
            },
          },
        };
      },
    ],
  };
};
