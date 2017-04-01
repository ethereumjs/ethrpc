"use strict";

function MockTransport(noSubscriptionSupport) {
  var currentBlockNumber = 0;
  var currentBranch = 0;
  var nextToken = 1;
  var reconnectCallbacks = {};
  var newHeadsCallbacks = {};

  var blocks = [
    [
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0000",
        parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        number: "0x0",
      },
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0001",
        parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0000",
        number: "0x1",
      },
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0002",
        parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0001",
        number: "0x2",
      },
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0003",
        parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0002",
        number: "0x3",
      },
    ],
    [
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0000",
        parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        number: "0x0",
      },
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0011",
        parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0000",
        number: "0x1",
      },
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0012",
        parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0011",
        number: "0x2",
      },
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0013",
        parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0012",
        number: "0x3",
      },
    ],
    [
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0000",
        parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        number: "0x0",
      },
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0011",
        parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0000",
        number: "0x1",
      },
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0022",
        parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0011",
        number: "0x2",
      },
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0023",
        parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0022",
        number: "0x3",
      },
    ],
    [
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0000",
        parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        number: "0x0",
      },
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0031",
        parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0000",
        number: "0x1",
      },
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0032",
        parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0031",
        number: "0x2",
      },
      {
        hash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0033",
        parentHash: "0xbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0cbl0c0032",
        number: "0x3",
      },
    ]
  ]

  this.getLatestBlock = function (callback) {
    var block = this.getCurrentBlock();
    setImmediate(function () { callback(undefined, block); });
  }.bind(this);

  this.getBlockByHash = function(hash, callback) {
    var block = blocks[currentBranch].find(function (block) { return block.hash === hash });
    setImmediate(function () { callback(undefined, block); });
  }.bind(this);

  this.subscribeToNewHeads = function (callback, onSubscriptionError) {
    if (noSubscriptionSupport) return setImmediate(onSubscriptionError);
    var token = (nextToken++).toString();
    newHeadsCallbacks[token] = callback;
    return token;
  }.bind(this);

  this.subscribeToReconnects = function (callback, onSubscriptionError) {
    if (noSubscriptionSupport) return setImmediate(onSubscriptionError);
    var token = (nextToken++).toString();
    reconnectCallbacks[token] = callback;
    return token;
  }.bind(this);

  this.unsubscribeFromReconnects = function (token) {
    delete reconnectCallbacks[token];
  }.bind(this);

  this.unsubscribeFromNewHeads = function (token) {
    delete newHeadsCallbacks[token];    
  }.bind(this);

  this.simulateReconnect = function () {
    newHeadsCallbacks = {};
    if (noSubscriptionSupport) return;
    for (var key in reconnectCallbacks) {
      reconnectCallbacks[key]();
    }
  }.bind(this);

  this.simulateNewBlock = function () {
    var block = blocks[currentBranch][++currentBlockNumber];
    if (noSubscriptionSupport) return;
    for (var key in newHeadsCallbacks) {
      newHeadsCallbacks[key](block);
    }
  }.bind(this);

  this.simulateRepublishBlock = function () {
    var block = blocks[currentBranch][currentBlockNumber];
    if (noSubscriptionSupport) return;
    for (var key in newHeadsCallbacks) {
      newHeadsCallbacks[key](block);
    }
  }.bind(this);

  this.simulateSkippedBlock = function () {
    currentBlockNumber += 2;
    var block = blocks[currentBranch][currentBlockNumber];
    if (noSubscriptionSupport) return;
    for (var key in newHeadsCallbacks) {
      newHeadsCallbacks[key](block);
    }
  }.bind(this);

  this.simulateReorg = function (newBranch, newBlockNumber) {
    currentBranch = newBranch;
    currentBlockNumber = newBlockNumber;
    this.simulateRepublishBlock();
  }.bind(this);

  this.simulateBlockPush = function (block) {
    for (var key in newHeadsCallbacks) {
      newHeadsCallbacks[key](block);
    }
  }.bind(this);

  this.getCurrentBlock = function () {
    return blocks[currentBranch][currentBlockNumber];
  }.bind(this);
}

module.exports = MockTransport;
