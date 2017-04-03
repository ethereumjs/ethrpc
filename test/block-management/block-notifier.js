var assert = require("chai").assert;
var BlockNotifier = require("../../src/block-management/block-notifier.js");
var MockTransport = require("./mock-transport.js");

describe("BlockNotifier", function () {
  var assertingCallback = function () { assert.isFalse(true, "should not have been called"); };
  var mockTransport;
  var blockNotifier;
  beforeEach(function () {
    mockTransport = new MockTransport();
  });
  afterEach(function () {
    if (blockNotifier) blockNotifier.destroy();
  });

  // disabled due to a bug in geth that requires us to fetch the block on subscription notification
  // it("uses subscriptions when available", function (done) {
  //   blockNotifier = new BlockNotifier(mockTransport, 1);
  //   mockTransport.getLatestBlock = assertingCallback;
  //   var pushing = false;
  //   blockNotifier.subscribe(function (block) {
  //     assert.isTrue(pushing);
  //     assert.deepEqual(block, mockTransport.getCurrentBlock());
  //     done();
  //   });
  //   setTimeout(function () {
  //     pushing = true;
  //     mockTransport.simulateNewBlock();
  //     pushing = false;
  //   }, 2);
  // });

  it("falls back to polling if new heads subscriptions fail", function (done) {
    mockTransport.subscribeToNewHeads = function (_, onCriticalFailure) { setImmediate(onCriticalFailure); };
    blockNotifier = new BlockNotifier(mockTransport, 1);
    blockNotifier.subscribe(function (block) {
      assert.deepEqual(block, mockTransport.getCurrentBlock());
      done();
      // in order to avoid a race in this test due to it being possible to already have the next poll in-flight by the time subscribe callback is called which will lead to double done, clear the done function after calling it.  this tests job isn't to validate detroy functionality
      done = function () {};
    });
  });

  it("falls back to polling if re-subscribing after reconnect fails", function (done) {
    blockNotifier = new BlockNotifier(mockTransport, 1);
    var wasCalled = false;
    var token = blockNotifier.subscribe(function (block) {
      if (wasCalled) assert.isFalse(true, "should have only been called once");
      wasCalled = true;
      assert.deepEqual(block, mockTransport.getCurrentBlock());
    });
    mockTransport.simulateNewBlock();
    blockNotifier.unsubscribe(token);
    blockNotifier.subscribe(function (block) {
      assert.deepEqual(block, mockTransport.getCurrentBlock());
      done();
    });
    mockTransport.subscribeToNewHeads = function (_, onCriticalFailure) { setImmediate(onCriticalFailure); };
    mockTransport.simulateReconnect();
  });

  it("falls back to polling if reconnect subscription fails", function (done) {
    mockTransport.subscribeToReconnects = function (_, onCriticalFailure) { setImmediate(onCriticalFailure); };
    blockNotifier = new BlockNotifier(mockTransport, 1);
    blockNotifier.subscribe(function (block) {
      assert.deepEqual(block, mockTransport.getCurrentBlock());
      done();
    });
  });

  it("stops firing callback if destroyed (subscription)", function (done) {
    blockNotifier = new BlockNotifier(mockTransport, 1);
    blockNotifier.subscribe(assertingCallback);
    blockNotifier.destroy();
    mockTransport.simulateNewBlock();
    setTimeout(done, 2);
  });

  it("stops firing callback if destroyed (polling)", function (done) {
    mockTransport.subscribeToReconnects = function (_, onCriticalFailure) { setImmediate(onCriticalFailure); };
    blockNotifier = new BlockNotifier(mockTransport, 1);
    blockNotifier.subscribe(assertingCallback);
    blockNotifier.destroy();
    setTimeout(done, 2);
  });
});
