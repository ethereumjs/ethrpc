/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var proxyquire = require("proxyquire");
var mockStore = require("../mock-store");

var mockNewHeadsSubscription = { id: "NEW_HEADS_SUBSCRIPTION_ID", reconnectToken: "NEW_HEADS_SUBSCRIPTION_RECONNECT_TOKEN" };

describe("block-management/unsubscribe-from-new-block-notifications", function () {
  it("unsubscribe", function (done) {
    var store = mockStore({
      newHeadsSubscription: mockNewHeadsSubscription,
      storeObservers: { NEW_HEADS_SUBSCRIPTION_ID: { reaction: "SET_CURRENT_BLOCK", unsubscribeToken: 1 } },
    });
    store.dispatch(proxyquire("../../src/block-management/unsubscribe-from-new-block-notifications.js", {
      "../wrappers/eth": {
        unsubscribe: function (subscriptionID, callback) {
          return function (dispatch, getState) {
            assert.strictEqual(subscriptionID, mockNewHeadsSubscription.id);
            assert.isFunction(callback);
            var state = getState();
            assert.deepEqual(state.newHeadsSubscription, { id: undefined, reconnectToken: undefined });
            assert.deepEqual(state.storeObservers, {});
            done();
          };
        },
      },
      "../internal-state": {
        get: function (key) {
          assert.strictEqual(key, "transporter");
          return {
            removeReconnectListener: function (reconnectToken) {
              assert.strictEqual(reconnectToken, mockNewHeadsSubscription.reconnectToken);
            },
          };
        },
      },
    })());
  });
});
