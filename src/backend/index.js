// Backend Dispatcher (Homebrew)

const brew = require('./brew');

module.exports = {
  ...brew,
  name: 'brew',
  backends: {
    brew
  }
};
