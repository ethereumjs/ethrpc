var assert = require("chai").assert;
var MockTransport = require("./mock-transport.js");
var PollingBlockNotifier = require("../../src/block-management/polling-block-notifier.js");

describe("PollingBlockNotifier", function () {
  var mockTransport;
  beforeEach(function () {
    mockTransport = new MockTransport();
  });

  it("polls transport for new blocks", function (done) {
    var transport = {
      getBlockByNumber: getBlockByNumber
    };
    var pollingBlockNotifier = new PollingBlockNotifier(transport, 1);
    function getBlockByNumber(number, fullBlock, callback) {
      assert.strictEqual(number, "latest");
      assert.isFalse(fullBlock);
      assert.isFunction(callback);
      pollingBlockNotifier.destroy();
      done();
    }
  });

  it("notifies subscribers with block from transport", function (done) {
    var pollingBlockNotifier = new PollingBlockNotifier(mockTransport, 1);
    pollingBlockNotifier.subscribe(function (block) {
      assert.deepEqual(block, mockTransport.getCurrentBlock());
      pollingBlockNotifier.destroy();
      done();
    });
  });

  it("throws exception to transport on invalid block", function (done) {
    mockTransport = {
      getBlockByNumber: function (number, fullBlock, callback) {
        assert.throws(function () { callback({}); });
        pollingBlockNotifier.destroy();
      }
    };
    var pollingBlockNotifier = new PollingBlockNotifier(mockTransport, 1);
    pollingBlockNotifier.subscribe(assertingCallback);
    setTimeout(done, 2);
  });

  it("stops polling on destroy", function (done) {
    var pollingBlockNotifier = new PollingBlockNotifier(mockTransport, 1);
    pollingBlockNotifier.destroy();
    mockTransport.getBlockByNumber = assertingCallback;
    setTimeout(done, 2);
  });

  it("stops notifying on destroy", function (done) {
    var pollingBlockNotifier = new PollingBlockNotifier(mockTransport, 1);
    pollingBlockNotifier.subscribe(assertingCallback);
    pollingBlockNotifier.destroy();
    setTimeout(done, 2);
  })

  function assertingCallback() {
    assert.isFalse(true, "should not have been called");
  }
});
