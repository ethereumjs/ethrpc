/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var proxyquire = require("proxyquire");
var mockStore = require("../mock-store");

describe("block-management/listen-for-new-blocks", function () {
  it("poll for blocks if using metamask", function (done) {
    mockStore({}).dispatch(proxyquire("../../src/block-management/listen-for-new-blocks.js", {
      "./start-polling-for-blocks": function () {
        return function (/*dispatch*/) { done(); };
      },
      "./subscribe-to-new-block-notifications": function () {
        return function (/*dispatch*/) { assert.fail(); };
      },
      "./unsubscribe-from-new-block-notifications": function () {
        return function (/*dispatch*/) { assert.fail(); };
      },
      "../utils/is-meta-mask": function () { return true; },
    })());
  });
  it("subscribe to new block notifications", function (done) {
    mockStore({}).dispatch(proxyquire("../../src/block-management/listen-for-new-blocks.js", {
      "./start-polling-for-blocks": function () {
        return function (/*dispatch*/) { assert.fail(); };
      },
      "./subscribe-to-new-block-notifications": function () {
        return function (/*dispatch*/) { done(); };
      },
      "./unsubscribe-from-new-block-notifications": function () {
        return function (/*dispatch*/) { assert.fail(); };
      },
      "../utils/is-meta-mask": function () { return false; },
    })());
  });
  it("fall back to polling for blocks if subscription fails", function (done) {
    mockStore({}).dispatch(proxyquire("../../src/block-management/listen-for-new-blocks.js", {
      "./start-polling-for-blocks": function () {
        return function (/*dispatch*/) { done(); };
      },
      "./subscribe-to-new-block-notifications": function (callback) {
        return function (/*dispatch*/) { callback({ message: "Method not found" }); };
      },
      "./unsubscribe-from-new-block-notifications": function () {
        return function (/*dispatch*/) {};
      },
      "../utils/is-meta-mask": function () { return false; },
    })());
  });
});
