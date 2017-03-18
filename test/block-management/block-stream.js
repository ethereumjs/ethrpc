"use strict";

var assert = require("chai").assert;
var BlockNotifier = require("../../src/block-management/block-notifier.js");
var BlockStream = require("../../src/block-management/block-stream.js");
var MockTransport = require("./mock-transport.js");

describe("BlockStream", function () {
  var mockTransport;
  var blockStream;
  beforeEach(function () {
    mockTransport = new MockTransport();
  });
  afterEach(function () {
    if (blockStream) blockStream.destroy();
  });

  it("notifies subscriber of new blocks as they arrive", function (done) {
    blockStream = new BlockStream(mockTransport, 1);
    blockStream.subscribe(function (block) {
      assert.deepEqual(block, mockTransport.getCurrentBlock());
      done();
    });
    mockTransport.simulateNewBlock();
  });

  it("notifies subscriber once per block", function (done) {
    blockStream = new BlockStream(mockTransport, 1);
    var called = false;
    blockStream.subscribe(function (block) {
      assert.isFalse(called);
      called = true;
      assert.deepEqual(block, mockTransport.getCurrentBlock());
      setTimeout(done, 2);
    });
    mockTransport.simulateRepublishBlock();
    mockTransport.simulateRepublishBlock();
    mockTransport.simulateRepublishBlock();
    mockTransport.simulateRepublishBlock();
  });

  it("backfills missed blocks", function (done) {
    blockStream = new BlockStream(mockTransport, 1);
    var lastSeenBlockNumber = null;
    var finalBlockNumber = null;
    blockStream.subscribe(function (block) {
      var thisBlockNumber = parseInt(block.number);
      if (lastSeenBlockNumber === null) return (lastSeenBlockNumber = thisBlockNumber);

      assert.strictEqual(thisBlockNumber, lastSeenBlockNumber + 1);

      lastSeenBlockNumber = thisBlockNumber;
      if (finalBlockNumber && finalBlockNumber === thisBlockNumber) done();
    });
    mockTransport.simulateNewBlock();
    mockTransport.simulateSkippedBlock();
    finalBlockNumber = parseInt(mockTransport.getCurrentBlock().number);
  });

  it("notifies of removed blocks on reorg", function (done) {
    var nextExpectedBlockIndex = 0;
    var expectedBlocks = [
      { added: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0000" },
      { added: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0001" },
      { added: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0002" },
      { added: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0003" },
      { removed: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0003" },
      { removed: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0002" },
      { removed: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0001" },
      { added: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0011" },
      { added: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0012" },
      { added: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0013" },
    ];
    blockStream = new BlockStream(mockTransport, 1);
    blockStream.subscribe(function (addedBlock, removedBlock) {
      var expectedBlock = expectedBlocks[nextExpectedBlockIndex++];
      if (expectedBlock.added) {
        assert.isNull(removedBlock);
        assert.strictEqual(addedBlock.hash, expectedBlock.hash);
      } else if (expectedBlock.removed) {
        assert.isNull(addedBlock);
        assert.strictEqual(removedBlock.hash, expectedBlock.hash);
      } else {
        assert.isFalse(true, "bug in test data");
      }
      if (nextExpectedBlockIndex === expectedBlocks.length) done();
    });
    mockTransport.simulateRepublishBlock();
    mockTransport.simulateNewBlock();
    mockTransport.simulateNewBlock();
    mockTransport.simulateNewBlock();
    mockTransport.simulateReorg(1, 3);
  });

  it("does finite backfill if reorg happens past first block", function (done) {
    mockTransport.getBlockByHash = function (hash, fullBlock, callback) {
      var blockNumber = parseInt(hash.substring(62), 16);
      var blockNumberHex = blockNumber.toString(16);
      var parentBlockNumber = blockNumber - 1;
      var parentBlockNumberHex = parentBlockNumber.toString(16);
      return setImmediate(callback.bind(undefined, {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c" + ("0000" + blockNumberHex).substring(blockNumberHex),
        parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c" + ("0000" + parentBlockNumberHex).substring(parentBlockNumberHex),
        number: "0x" + blockNumber.toString(16),
      }));
    }
    blockStream = new BlockStream(mockTransport, 1);
    var nextExpectedBlockIndex = 0;
    var expectedBlocks = [
      { added: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0001" },
      { removed: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0001" },
      { added: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cffff" },
    ];
    blockStream.subscribe(function (addedBlock, removedBlock) {
      var expectedBlock = expectedBlocks[nextExpectedBlockIndex++];
      if (expectedBlock.added) {
        assert.isNull(removedBlock);
        assert.strictEqual(addedBlock.hash, expectedBlock.hash);
      } else if (expectedBlock.removed) {
        assert.isNull(addedBlock);
        assert.strictEqual(removedBlock.hash, expectedBlock.hash);
      } else {
        assert.isFalse(true, "bug in test data");
      }
      if (nextExpectedBlockIndex >= expectedBlocks.length) done();
    });
    mockTransport.simulateBlockPush({
      hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0001",
      parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cfffd",
      number: "0xfffe",
    });
    mockTransport.simulateBlockPush({
      hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cffff",
      parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cfffe",
      number: "0xffff",
    });
    var originalGetBlockByNumber = mockTransport.getBlockByNumber;
    mockTransport.getBlockByNumber = function (number, fullBlock, callback) {
      if (number === "latest") callback({
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cffff",
        parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cfffe",
        number: "0xffff",
      });
      else originalGetBlockByNumber(number, fullBlock, callback);
    };
  });

  it("correctly handles reorg during backfill", function (done) {
    var nextExpectedBlockIndex = 0;
    var expectedBlocks = [
      { added: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0000" },
      { added: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0001" },
      { added: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0002" },
      { removed: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0002" },
      { removed: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0001" },
      { added: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0011" },
      { added: true, hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0012" },
    ];
    blockStream = new BlockStream(mockTransport, 1);
    blockStream.subscribe(function (addedBlock, removedBlock) {
      var expectedBlock = expectedBlocks[nextExpectedBlockIndex++];
      if (expectedBlock.added) {
        assert.isNull(removedBlock);
        assert.strictEqual(addedBlock.hash, expectedBlock.hash);
      } else if (expectedBlock.removed) {
        assert.isNull(addedBlock);
        assert.strictEqual(removedBlock.hash, expectedBlock.hash);
      } else {
        assert.isFalse(true, "bug in test data");
      }
      if (nextExpectedBlockIndex === expectedBlocks.length) done();
    });
    mockTransport.simulateRepublishBlock(); // push branch 0, block 0
    mockTransport.simulateSkippedBlock(); // push branch 0, block 2
    mockTransport.simulateReorg(1, 2); // push branch 1, block 2; will happen before backfill lookup finishes
  });
});
