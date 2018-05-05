/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var proxyquire = require("proxyquire");
var mockStore = require("../mock-store");

describe("block-management/subscribe-to-new-block-notifications", function () {
  it("subscription succeeds", function (done) {
    var store = mockStore({});
    store.dispatch(proxyquire("../../src/block-management/subscribe-to-new-block-notifications.js", {
      "../wrappers/eth": {
        subscribe: function (p, callback) {
          return function (/*dispatch*/) {
            assert.deepEqual(p, ["newHeads", {}]);
            callback(null, "NEW_HEADS_SUBSCRIPTION_ID");
          };
        },
        unsubscribe: function (/*p, callback*/) {
          return function (/*dispatch*/) { assert.fail(); };
        },
      },
      "../internal-state": {
        get: function (key) {
          assert.strictEqual(key, "transporter");
          return {
            addReconnectListener: function (callback) {
              assert.isFunction(callback);
              return "NEW_HEADS_SUBSCRIPTION_RECONNECT_TOKEN";
            },
          };
        },
      },
      "../store-observers/current-block": function (id, callback) {
        return function (dispatch, getState) {
          assert.strictEqual(id, "NEW_HEADS_SUBSCRIPTION_ID");
          assert.isFunction(callback);
          assert.deepEqual(getState().newHeadsSubscription, {
            id: "NEW_HEADS_SUBSCRIPTION_ID",
            reconnectToken: "NEW_HEADS_SUBSCRIPTION_RECONNECT_TOKEN",
          });
          done();
        };
      },
    })(assert.fail));
  });
  it("subscription fails", function (done) {
    var store = mockStore({});
    store.dispatch(proxyquire("../../src/block-management/subscribe-to-new-block-notifications.js", {
      "../wrappers/eth": {
        subscribe: function (p, callback) {
          return function (/*dispatch*/) {
            assert.deepEqual(p, ["newHeads", {}]);
            callback({ message: "Method not found" });
          };
        },
        unsubscribe: function (/*p, callback*/) {
          return function (/*dispatch*/) { assert.fail(); };
        },
      },
      "../internal-state": {
        get: assert.fail,
      },
      "../store-observers/current-block": function (/*id, callback*/) {
        return function (/*dispatch*/) { assert.fail(); };
      },
    })(function (err) {
      assert.deepEqual(err, { message: "Method not found" });
      assert.deepEqual(store.getState().newHeadsSubscription, { id: null, reconnectToken: undefined });
      done();
    }));
  });
});
