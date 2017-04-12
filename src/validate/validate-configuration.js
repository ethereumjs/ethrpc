"use strict";

var isNotString = require("../utils/is-not-string");

function validateConfiguration(configuration) {
  // validate configuration
  if (!Array.isArray(configuration.httpAddresses)) {
    configuration.errorHandler(new Error("configuration.httpAddresses must be an array."));
  } else if (configuration.httpAddresses.some(isNotString)) {
    configuration.errorHandler(new Error("configuration.httpAddresses must contain only strings."));
  } else if (!Array.isArray(configuration.wsAddresses)) {
    configuration.errorHandler(new Error("configuration.wsAddresses must be an array."));
  } else if (configuration.wsAddresses.some(isNotString)) {
    configuration.errorHandler(new Error("configuration.wsAddresses must contain only strings."));
  } else if (!Array.isArray(configuration.ipcAddresses)) {
    configuration.errorHandler(new Error("configuration.ipcAddresses must be an array."));
  } else if (configuration.ipcAddresses.some(isNotString)) {
    configuration.errorHandler(new Error("configuration.ipcAddresses must contain only strings."));
  }
}

module.exports = validateConfiguration;
