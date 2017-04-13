/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var clone = require("clone");
var abi = require("augur-abi");
var reducer = require("../../src/reducers/transactions");

describe("reducers/transactions", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("UPDATE_TRANSACTION", function () {
    test({
      description: "Add a new object field to an existing transaction",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          payload: {
            method: "myTransaction",
            from: "0xb0b",
            to: "0xd00d"
          },
          callReturn: "0x12",
          count: 0,
          status: "pending"
        }
      },
      action: {
        type: "UPDATE_TRANSACTION",
        hash: "0xdeadbeef",
        data: { tx: { key1: "value1" } }
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            payload: {
              method: "myTransaction",
              from: "0xb0b",
              to: "0xd00d"
            },
            callReturn: "0x12",
            count: 0,
            status: "pending",
            tx: { key1: "value1" }
          }
        });
      }
    });
    test({
      description: "Update two different object fields in an existing transaction",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          payload: {
            method: "myTransaction",
            from: "0xb0b",
            to: "0xd00d"
          },
          callReturn: "0x12",
          count: 0,
          status: "pending",
          tx: { key1: "value1" }
        }
      },
      action: {
        type: "UPDATE_TRANSACTION",
        hash: "0xdeadbeef",
        data: {
          payload: { method: "lulz" },
          tx: { key2: "value2" }
        }
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            payload: {
              method: "lulz",
              from: "0xb0b",
              to: "0xd00d"
            },
            callReturn: "0x12",
            count: 0,
            status: "pending",
            tx: { key1: "value1", key2: "value2" }
          }
        });
      }
    });
  });
});
