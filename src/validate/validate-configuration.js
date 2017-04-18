"use strict";

function validateConfiguration(configuration) {
  if (!Array.isArray(configuration.httpAddresses)) {
    configuration.errorHandler(new Error("configuration.httpAddresses must be an array."));
  } else if (configuration.httpAddresses.some(function (x) { return typeof x !== "string"; })) {
    configuration.errorHandler(new Error("configuration.httpAddresses must contain only strings."));
  } else if (!Array.isArray(configuration.wsAddresses)) {
    configuration.errorHandler(new Error("configuration.wsAddresses must be an array."));
  } else if (configuration.wsAddresses.some(function (x) { return typeof x !== "string"; })) {
    configuration.errorHandler(new Error("configuration.wsAddresses must contain only strings."));
  } else if (!Array.isArray(configuration.ipcAddresses)) {
    configuration.errorHandler(new Error("configuration.ipcAddresses must be an array."));
  } else if (configuration.ipcAddresses.some(function (x) { return typeof x !== "string"; })) {
    configuration.errorHandler(new Error("configuration.ipcAddresses must contain only strings."));
  }
  return configuration;
}

module.exports = validateConfiguration;
