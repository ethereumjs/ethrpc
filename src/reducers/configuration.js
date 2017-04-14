"use strict";

var validateConfiguration = require("../validate/validate-configuration");
var isFunction = require("../utils/is-function");

var initialState = {
  httpAddresses: [],
  wsAddresses: [],
  ipcAddresses: [],
  connectionTimeout: 3000,
  pollingIntervalMilliseconds: 30000,
  blockRetention: 100,
  errorHandler: null
};

module.exports = function (configuration, action) {
  var updatedConfiguration;
  if (typeof configuration === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_CONFIGURATION":
      updatedConfiguration = Object.keys(configuration).reduce(function (p, key) {
        p[key] = (action.configuration[key] != null) ? action.configuration[key] : configuration[key];
        return p;
      }, {});

      // use default error handler (console.error) if not set
      if (!isFunction(updatedConfiguration.errorHandler)) {
        updatedConfiguration.errorHandler = function (err) { console.error(err); };
      }

      validateConfiguration(updatedConfiguration);
      return updatedConfiguration;
    case "RESET_CONFIGURATION":
      return initialState;
    default:
      return configuration;
  }
};
