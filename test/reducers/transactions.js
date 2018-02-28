/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var reducer = require("../../src/reducers/transactions");

describe("reducers/transactions", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("ADD_TRANSACTION", function () {
    test({
      description: "Add a new transaction, initial state empty",
      state: {},
      action: {
        type: "ADD_TRANSACTION",
        transaction: {
          hash: "0xf00dbeef",
          payload: {
            method: "myOtherTransaction",
            from: "0xb0b",
            to: "0xd00d",
          },
          callReturn: "0x42",
          count: 0,
          status: "pending",
        },
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xf00dbeef": {
            hash: "0xf00dbeef",
            payload: {
              method: "myOtherTransaction",
              from: "0xb0b",
              to: "0xd00d",
            },
            callReturn: "0x42",
            count: 0,
            status: "pending",
          },
        });
      },
    });
    test({
      description: "Add a new transaction, initial state non-empty",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          payload: {
            method: "myTransaction",
            from: "0xb0b",
            to: "0xd00d",
          },
          callReturn: "0x12",
          count: 0,
          status: "pending",
        },
      },
      action: {
        type: "ADD_TRANSACTION",
        transaction: {
          hash: "0xf00dbeef",
          payload: {
            method: "myOtherTransaction",
            from: "0xb0b",
            to: "0xd00d",
          },
          callReturn: "0x42",
          count: 0,
          status: "pending",
        },
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            payload: {
              method: "myTransaction",
              from: "0xb0b",
              to: "0xd00d",
            },
            callReturn: "0x12",
            count: 0,
            status: "pending",
          },
          "0xf00dbeef": {
            hash: "0xf00dbeef",
            payload: {
              method: "myOtherTransaction",
              from: "0xb0b",
              to: "0xd00d",
            },
            callReturn: "0x42",
            count: 0,
            status: "pending",
          },
        });
      },
    });
    test({
      description: "Overwrite an existing transaction",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          payload: {
            method: "myTransaction",
            from: "0xb0b",
            to: "0xd00d",
          },
          callReturn: "0x12",
          count: 0,
          status: "pending",
        },
      },
      action: {
        type: "ADD_TRANSACTION",
        transaction: {
          hash: "0xdeadbeef",
          payload: {
            method: "myOtherTransaction",
            from: "0xb0b",
            to: "0xd00d",
          },
          callReturn: "0x42",
          count: 0,
          status: "pending",
        },
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            payload: {
              method: "myOtherTransaction",
              from: "0xb0b",
              to: "0xd00d",
            },
            callReturn: "0x42",
            count: 0,
            status: "pending",
          },
        });
      },
    });
  });
  describe("UPDATE_TRANSACTION", function () {
    test({
      description: "Add a new object field to an existing transaction",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          payload: {
            method: "myTransaction",
            from: "0xb0b",
            to: "0xd00d",
          },
          callReturn: "0x12",
          count: 0,
          status: "pending",
        },
      },
      action: {
        type: "UPDATE_TRANSACTION",
        hash: "0xdeadbeef",
        data: { tx: { key1: "value1" } },
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            payload: {
              method: "myTransaction",
              from: "0xb0b",
              to: "0xd00d",
            },
            callReturn: "0x12",
            count: 0,
            status: "pending",
            tx: { key1: "value1" },
          },
        });
      },
    });
    test({
      description: "Update two different object fields in an existing transaction",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          payload: {
            method: "myTransaction",
            from: "0xb0b",
            to: "0xd00d",
          },
          callReturn: "0x12",
          count: 0,
          status: "pending",
          tx: { key1: "value1" },
        },
      },
      action: {
        type: "UPDATE_TRANSACTION",
        hash: "0xdeadbeef",
        data: {
          payload: { method: "myOtherTransaction" },
          tx: { key2: "value2" },
        },
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            payload: {
              method: "myOtherTransaction",
              from: "0xb0b",
              to: "0xd00d",
            },
            callReturn: "0x12",
            count: 0,
            status: "pending",
            tx: { key1: "value1", key2: "value2" },
          },
        });
      },
    });
  });
  describe("LOCK_TRANSACTION", function () {
    test({
      description: "Lock a pending transaction",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          status: "pending",
        },
      },
      action: {
        type: "LOCK_TRANSACTION",
        hash: "0xdeadbeef",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            status: "pending",
            isLocked: true,
          },
        });
      },
    });
  });
  describe("UNLOCK_TRANSACTION", function () {
    test({
      description: "Unlock a pending transaction",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          status: "pending",
          isLocked: true,
        },
      },
      action: {
        type: "UNLOCK_TRANSACTION",
        hash: "0xdeadbeef",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            status: "pending",
            isLocked: false,
          },
        });
      },
    });
  });
  describe("SET_TRANSACTION_CONFIRMATIONS", function () {
    test({
      description: "Set confirmations to current block number minus mined block number",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          tx: { blockNumber: 93 },
        },
      },
      action: {
        type: "SET_TRANSACTION_CONFIRMATIONS",
        hash: "0xdeadbeef",
        currentBlockNumber: 100,
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            tx: { blockNumber: 93 },
            confirmations: 7,
          },
        });
      },
    });
  });
  describe("TRANSACTION_FAILED", function () {
    test({
      description: "Set transaction status to 'failed'",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          status: "sealed",
        },
      },
      action: {
        type: "TRANSACTION_FAILED",
        hash: "0xdeadbeef",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            status: "failed",
          },
        });
      },
    });
  });
  describe("TRANSACTION_SEALED", function () {
    test({
      description: "Set transaction status to 'mined'",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          status: "pending",
        },
      },
      action: {
        type: "TRANSACTION_SEALED",
        hash: "0xdeadbeef",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            status: "sealed",
          },
        });
      },
    });
  });
  describe("TRANSACTION_RESUBMITTED", function () {
    test({
      description: "Set transaction status to 'resubmitted'",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          status: "sealed",
        },
      },
      action: {
        type: "TRANSACTION_RESUBMITTED",
        hash: "0xdeadbeef",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            status: "resubmitted",
          },
        });
      },
    });
  });
  describe("TRANSACTION_CONFIRMED", function () {
    test({
      description: "Set transaction status to 'confirmed'",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          status: "sealed",
        },
      },
      action: {
        type: "TRANSACTION_CONFIRMED",
        hash: "0xdeadbeef",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            status: "confirmed",
          },
        });
      },
    });
  });
  describe("INCREMENT_TRANSACTION_COUNT", function () {
    test({
      description: "Increment an existing transaction count",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          count: 1,
        },
      },
      action: {
        type: "INCREMENT_TRANSACTION_COUNT",
        hash: "0xdeadbeef",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            count: 2,
          },
        });
      },
    });
    test({
      description: "Set an undefined transaction count to 1",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
        },
      },
      action: {
        type: "INCREMENT_TRANSACTION_COUNT",
        hash: "0xdeadbeef",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            count: 1,
          },
        });
      },
    });
  });
  describe("INCREMENT_TRANSACTION_PAYLOAD_TRIES", function () {
    test({
      description: "Increment an existing transaction payload tries counter",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          payload: {
            method: "sayHelloToTheWorld",
            tries: 2,
          },
        },
      },
      action: {
        type: "INCREMENT_TRANSACTION_PAYLOAD_TRIES",
        hash: "0xdeadbeef",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            payload: {
              method: "sayHelloToTheWorld",
              tries: 3,
            },
          },
        });
      },
    });
    test({
      description: "Set an transaction payload with undefined tries counter to 1",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          payload: {
            method: "sayHelloToTheWorld",
          },
        },
      },
      action: {
        type: "INCREMENT_TRANSACTION_PAYLOAD_TRIES",
        hash: "0xdeadbeef",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            payload: {
              method: "sayHelloToTheWorld",
              tries: 1,
            },
          },
        });
      },
    });
    test({
      description: "Set an empty transaction payload tries counter to 1",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          payload: {},
        },
      },
      action: {
        type: "INCREMENT_TRANSACTION_PAYLOAD_TRIES",
        hash: "0xdeadbeef",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            payload: { tries: 1 },
          },
        });
      },
    });
    test({
      description: "Set an undefined transaction payload tries counter to 1",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
        },
      },
      action: {
        type: "INCREMENT_TRANSACTION_PAYLOAD_TRIES",
        hash: "0xdeadbeef",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": {
            hash: "0xdeadbeef",
            payload: { tries: 1 },
          },
        });
      },
    });
  });
  describe("REMOVE_TRANSACTION", function () {
    test({
      description: "Remove a transaction",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          status: "sealed",
        },
        "0xf00dbeef": {
          hash: "0xf00dbeef",
          status: "pending",
        },
      },
      action: {
        type: "REMOVE_TRANSACTION",
        hash: "0xdeadbeef",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xf00dbeef": {
            hash: "0xf00dbeef",
            status: "pending",
          },
        });
      },
    });
    test({
      description: "Remove the last transaction",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          status: "sealed",
        },
      },
      action: {
        type: "REMOVE_TRANSACTION",
        hash: "0xdeadbeef",
      },
      assertions: function (state) {
        assert.deepEqual(state, {});
      },
    });
  });
  describe("REMOVE_ALL_TRANSACTIONS", function () {
    test({
      description: "Remove all transactions (reset state)",
      state: {
        "0xdeadbeef": {
          hash: "0xdeadbeef",
          status: "sealed",
        },
        "0xf00dbeef": {
          hash: "0xf00dbeef",
          status: "pending",
        },
      },
      action: {
        type: "REMOVE_ALL_TRANSACTIONS",
      },
      assertions: function (state) {
        assert.deepEqual(state, {});
      },
    });
  });
});
