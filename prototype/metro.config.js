const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// This repository keeps mobile dependencies inside prototype/. Metro's
// workspace auto-detection otherwise watches a non-existent root node_modules.
config.watchFolders = [];

process.env.CAMPUS_EXPO_BABEL_TRANSFORMER = config.transformer.babelTransformerPath;
config.transformer.babelTransformerPath = require.resolve('./custom-transformer');

module.exports = config;
