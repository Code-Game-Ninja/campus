const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

process.env.CAMPUS_EXPO_BABEL_TRANSFORMER = config.transformer.babelTransformerPath;
config.transformer.babelTransformerPath = require.resolve('./custom-transformer');

module.exports = config;
