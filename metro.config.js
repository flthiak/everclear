const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  stream: require.resolve('stream-browserify'),
  events: require.resolve('events'),
  ...config.resolver.extraNodeModules,
};

module.exports = config; 