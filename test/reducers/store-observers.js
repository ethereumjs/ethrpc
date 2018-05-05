/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var reducer = require("../../src/reducers/store-observers");

describe("reducers/store-observers", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("ADD_STORE_OBSERVER", function () {
    test({
      description: "Add a new store observer, initial state empty",
      state: {},
      action: {
        type: "ADD_STORE_OBSERVER",
        id: "0x0000000000000",
        reaction: "SET_CURRENT_BLOCK",
        unsubscribeToken: "0",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0x0000000000000": {
            unsubscribeToken: "0",
            reaction: "SET_CURRENT_BLOCK",
          },
        });
      },
    });
    test({
      description: "Add a new store observer, initial state non-empty",
      state: {
        "0x0000000000000": {
          unsubscribeToken: "0",
          reaction: "SET_CURRENT_BLOCK",
        },
      },
      action: {
        type: "ADD_STORE_OBSERVER",
        id: "0x00000000000001",
        reaction: "SET_CURRENT_BLOCK",
        unsubscribeToken: "2",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0x0000000000000": {
            unsubscribeToken: "0",
            reaction: "SET_CURRENT_BLOCK",
          },
          "0x00000000000001": {
            unsubscribeToken: "2",
            reaction: "SET_CURRENT_BLOCK",
          },
        });
      },
    });
    test({
      description: "Overwrite an existing store observer",
      state: {
        "0x0000000000000": {
          unsubscribeToken: "0",
          reaction: "SET_CURRENT_BLOCK",
        },
      },
      action: {
        type: "ADD_STORE_OBSERVER",
        id: "0x0000000000000",
        reaction: "SET_CURRENT_BLOCK",
        unsubscribeToken: "2",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0x0000000000000": {
            unsubscribeToken: "2",
            reaction: "SET_CURRENT_BLOCK",
          },
        });
      },
    });
  });
  describe("REMOVE_STORE_OBSERVER", function () {
    test({
      description: "Remove a store observer",
      state: {
        "0x0000000000000": {
          unsubscribeToken: "0",
          reaction: "SET_CURRENT_BLOCK",
        },
        "0x00000000000001": {
          unsubscribeToken: "2",
          reaction: "SET_CURRENT_BLOCK",
        },
      },
      action: {
        type: "REMOVE_STORE_OBSERVER",
        id: "0x0000000000000",
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0x00000000000001": {
            unsubscribeToken: "2",
            reaction: "SET_CURRENT_BLOCK",
          },
        });
      },
    });
    test({
      description: "Remove the last store observer",
      state: {
        "0x0000000000000": {
          unsubscribeToken: "0",
          reaction: "SET_CURRENT_BLOCK",
        },
      },
      action: {
        type: "REMOVE_STORE_OBSERVER",
        id: "0x0000000000000",
      },
      assertions: function (state) {
        assert.deepEqual(state, {});
      },
    });
  });
  describe("REMOVE_ALL_STORE_OBSERVERS", function () {
    test({
      description: "Remove all store observers (reset state)",
      state: {
        "0x0000000000000": {
          unsubscribeToken: "0",
          reaction: "SET_CURRENT_BLOCK",
        },
        "0x00000000000001": {
          unsubscribeToken: "2",
          reaction: "SET_CURRENT_BLOCK",
        },
      },
      action: {
        type: "REMOVE_ALL_STORE_OBSERVERS",
      },
      assertions: function (state) {
        assert.deepEqual(state, {});
      },
    });
  });
});
