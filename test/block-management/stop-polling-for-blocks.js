/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var mockStore = require("../mock-store");
var stopPollingForBlocks = require("../../src/block-management/stop-polling-for-blocks.js");

describe("block-management/stop-polling-for-blocks", function () {
  it("stop polling", function () {
    var store = mockStore({ newBlockPollingInterval: setInterval(function () {}, 1) });
    store.dispatch(stopPollingForBlocks());
    assert.isNull(store.getState().newBlockPollingInterval);
  });
  it("no active poll", function () {
    var store = mockStore({ newBlockPollingInterval: null });
    store.dispatch(stopPollingForBlocks());
    assert.isNull(store.getState().newBlockPollingInterval);
  });
});
