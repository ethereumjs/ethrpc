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
      return clone(action.configuration);
    case "RESET_CONFIGURATION":
      return initialState;
    default:
      return configuration;
  }
};
