const app = require('./app.json').expo;

module.exports = {
  ...app,
  experiments: {
    ...app.experiments,
    baseUrl: process.env.EXPO_PUBLIC_BASE_URL || app.experiments?.baseUrl || '',
  },
};
