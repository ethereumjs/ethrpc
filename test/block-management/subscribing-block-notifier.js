var assert = require("chai").assert;
var MockTransport = require("./mock-transport");
var SubscribingBlockNotifier = require("../../src/block-management/subscribing-block-notifier");

describe("block-management/subscribing-block-notifier", function () {
  var mockTransport;
  var assertingCallback = function () { assert.isFalse(true, "should not have been called"); };

  beforeEach(function () {
    mockTransport = new MockTransport();
  });

  it("notifies user on transport subscription push", function (done) {
    var subscribingBlockNotifier = new SubscribingBlockNotifier(mockTransport, assertingCallback);
    subscribingBlockNotifier.subscribe(function (block) {
      assert.deepEqual(block, mockTransport.getCurrentBlock());
      done();
    });
    mockTransport.simulateNewBlock();
  });

  it("resubscribes to new heads with transport on reconnect", function (done) {
    var subscribingBlockNotifier = new SubscribingBlockNotifier(mockTransport, assertingCallback);
    mockTransport.subscribeToNewHeads = function () { done(); };
    mockTransport.simulateReconnect();
  });

  it("calls error callback on new heads subscription failure", function (done) {
    mockTransport.subscribeToNewHeads = function (_, subscriptionFailureCallback) { subscriptionFailureCallback(); }
    var subscribingBlockNotifier = new SubscribingBlockNotifier(mockTransport, function () {
      done();
    });
  });

  it("calls error callback on reconnect subscription failure", function (done) {
    mockTransport.subscribeToReconnects = function (_, subscriptionFailureCallback) { subscriptionFailureCallback(); }
    var subscribingBlockNotifier = new SubscribingBlockNotifier(mockTransport, function () {
      done();
    });
  });

  it("notifies subscribers of new blocks across reconnects", function (done) {
    var subscribingBlockNotifier = new SubscribingBlockNotifier(mockTransport, assertingCallback);
    var callbackCount = 0;
    subscribingBlockNotifier.subscribe(function (block) {
      ++callbackCount;
      if (callbackCount === 1) return;
      else if (callbackCount === 2) done();
      else assert.isFalse(true, "callback called too many times");
    });
    mockTransport.simulateNewBlock();
    mockTransport.simulateReconnect();
    mockTransport.simulateNewBlock();
  });

  it("notifies subscribers of multiple blocks", function (done) {
    var subscribingBlockNotifier = new SubscribingBlockNotifier(mockTransport, assertingCallback);
    var blockCount = 0;
    subscribingBlockNotifier.subscribe(function (block) {
      ++blockCount;
      if (blockCount === 3) done();
    });
    mockTransport.simulateNewBlock();
    mockTransport.simulateNewBlock();
    mockTransport.simulateNewBlock();
  });

  it("notifies multiple subscribers of new blocks", function (done) {
    var subscribingBlockNotifier = new SubscribingBlockNotifier(mockTransport, assertingCallback);
    var subscribersCalled = 0;
    function callback() {
      ++subscribersCalled;
      if (subscribersCalled === 3) done();
    }
    subscribingBlockNotifier.subscribe(callback);
    subscribingBlockNotifier.subscribe(callback);
    subscribingBlockNotifier.subscribe(callback);
    mockTransport.simulateNewBlock();
  });
});
