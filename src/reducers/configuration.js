"use strict";

var clone = require("clone");

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
  if (typeof configuration === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_CONFIGURATION":
      // overwrite configuration values with user config, throw away unused user config
      var configuration = action.configuration;
      for (key in this.configuration) {
        if (this.configuration.hasOwnProperty(key)) {
          if (configuration[key] !== undefined && configuration[key] !== null) {
            this.configuration[key] = configuration[key];
          }
        }
      }

      // use default (console.error) error handler if not set
      if (!isFunction(this.configuration.errorHandler)) {
        this.configuration.errorHandler = function (err) { console.error(err); };
      }

      // validate configuration
      if (!Array.isArray(this.configuration.httpAddresses)) {
        return this.configuration.errorHandler(new Error("configuration.httpAddresses must be an array."));
      }
      if (this.configuration.httpAddresses.some(function (x) { return typeof x !== "string"; })) {
        return this.configuration.errorHandler(new Error("configuration.httpAddresses must contain only strings."));
      }
      if (!Array.isArray(this.configuration.wsAddresses)) {
        return this.configuration.errorHandler(new Error("configuration.wsAddresses must be an array."));
      }
      if (this.configuration.wsAddresses.some(function (x) { return typeof x !== "string"; })) {
        return this.configuration.errorHandler(new Error("configuration.wsAddresses must contain only strings."));
      }
      if (!Array.isArray(this.configuration.ipcAddresses)) {
        return this.configuration.errorHandler(new Error("configuration.ipcAddresses must be an array."));
      }
      if (this.configuration.ipcAddresses.some(function (x) { return typeof x !== "string"; })) {
        return this.configuration.errorHandler(new Error("configuration.ipcAddresses must contain only strings."));
      }
      // return clone(action.configuration);
    case "RESET_CONFIGURATION":
      return initialState;
    default:
      return configuration;
  }
};
