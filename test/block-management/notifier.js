/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var Notifier = require("../../src/block-management/notifier");

describe("block-management/notifier", function () {
  it("works with parameterless notifications", function (done) {
    var notifier = new Notifier();
    notifier.subscribe(function (a, b) {
      assert.strictEqual(a, undefined);
      assert.strictEqual(b, undefined);
      done();
    });
    notifier.notifySubscribers();
  });

  it("works with single parameter notifications", function (done) {
    var notifier = new Notifier();
    notifier.subscribe(function (a, b) {
      assert.strictEqual(a, "apple");
      assert.strictEqual(b, undefined);
      done();
    });
    notifier.notifySubscribers("apple");
  });

  it("works with multiple parameter notifications", function (done) {
    var notifier = new Notifier();
    notifier.subscribe(function (a, b, c) {
      assert.strictEqual(a, "apple");
      assert.strictEqual(b, "banana");
      assert.strictEqual(c, "cherry");
      done();
    });
    notifier.notifySubscribers("apple", "banana", "cherry");
  });

  it("doesn't require signatures match", function (done) {
    var notifier = new Notifier();
    notifier.subscribe(function () {
      done();
    });
    notifier.notifySubscribers("apple", "banana");
  });

  it("notifies multiple times", function (done) {
    var notifier = new Notifier();
    var notifiersContacted = 0;
    notifier.subscribe(function () {
      ++notifiersContacted;
      if (notifiersContacted === 2) done();
    });
    notifier.notifySubscribers();
    notifier.notifySubscribers();
  });

  it("works with multiple subscribers", function (done) {
    var notifier = new Notifier();
    var notifiersContacted = 0;
    function onNotification() {
      ++notifiersContacted;
      if (notifiersContacted === 2) done();
    }
    notifier.subscribe(onNotification);
    notifier.subscribe(onNotification);
    notifier.notifySubscribers();
  });

  it("unsubscribes", function (done) {
    var notifier = new Notifier();
    var token = notifier.subscribe(function () {
      assert.isFalse(true, "callback should not have been called");
    });
    notifier.unsubscribe(token);
    notifier.notifySubscribers();
    done();
  });

  it("unsubscribes all", function (done) {
    var notifier = new Notifier();
    notifier.subscribe(function () {
      assert.isFalse(true, "callback should not have been called");
    });
    notifier.subscribe(function () {
      assert.isFalse(true, "callback should not have been called");
    });
    notifier.unsubscribeAll();
    notifier.notifySubscribers();
    done();
  });
});
