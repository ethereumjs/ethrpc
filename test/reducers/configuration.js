/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var clone = require("clone");
var abi = require("augur-abi");
var noop = require("../../src/utils/noop");
var reducer = require("../../src/reducers/configuration");

describe("reducers/configuration", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("SET_CONFIGURATION", function () {
    test({
      description: "Set configuration options",
      state: {
        httpAddresses: [],
        wsAddresses: [],
        ipcAddresses: [],
        connectionTimeout: 3000,
        pollingIntervalMilliseconds: 30000,
        blockRetention: 100,
        errorHandler: null
      },
      action: {
        type: "SET_CONFIGURATION",
        configuration: {
          httpAddresses: ["https://eth3.augur.net"],
          wsAddresses: ["wss://ws.augur.net"],
          ipcAddresses: [],
          blockRetention: 10,
          errorHandler: noop
        }
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          httpAddresses: ["https://eth3.augur.net"],
          wsAddresses: ["wss://ws.augur.net"],
          ipcAddresses: [],
          connectionTimeout: 3000,
          pollingIntervalMilliseconds: 30000,
          blockRetention: 10,
          errorHandler: noop
        });
      }
    });
    test({
      description: "Ignore extra confirmation option fields",
      state: {
        httpAddresses: [],
        wsAddresses: [],
        ipcAddresses: [],
        connectionTimeout: 3000,
        pollingIntervalMilliseconds: 30000,
        blockRetention: 100,
        errorHandler: null
      },
      action: {
        type: "SET_CONFIGURATION",
        configuration: {
          httpAddresses: ["https://eth3.augur.net"],
          wsAddresses: ["wss://ws.augur.net"],
          ipcAddresses: [],
          blockRetention: 10,
          errorHandler: noop,
          cruft: "crufty!"
        }
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          httpAddresses: ["https://eth3.augur.net"],
          wsAddresses: ["wss://ws.augur.net"],
          ipcAddresses: [],
          connectionTimeout: 3000,
          pollingIntervalMilliseconds: 30000,
          blockRetention: 10,
          errorHandler: noop
        });
      }
    });
  });
  describe("RESET_CONFIGURATION", function () {
    test({
      description: "Reset configuration to initial state",
      state: {
        httpAddresses: ["https://eth3.augur.net"],
        wsAddresses: ["wss://ws.augur.net"],
        ipcAddresses: [],
        connectionTimeout: 10000,
        pollingIntervalMilliseconds: 30000,
        blockRetention: 10,
        errorHandler: noop
      },
      action: {
        type: "RESET_CONFIGURATION"
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          httpAddresses: [],
          wsAddresses: [],
          ipcAddresses: [],
          connectionTimeout: 3000,
          pollingIntervalMilliseconds: 30000,
          blockRetention: 100,
          errorHandler: null
        });
      }
    });
  });
});
