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
    ],
  ];

  this.getLatestBlock = function (callback) {
    var block = this.getCurrentBlock();
    setImmediate(function () { callback(undefined, block); });
  }.bind(this);

  this.getBlockByHash = function (hash, callback) {
    var block = blocks[currentBranch].find(function (block) { return block.hash === hash; });
    setImmediate(function () { callback(undefined, block); });
  };

  this.subscribeToNewHeads = function (callback, onSubscriptionError) {
    var token;
    if (noSubscriptionSupport) return setImmediate(onSubscriptionError);
    token = (nextToken++).toString();
    newHeadsCallbacks[token] = callback;
    return token;
  };

  this.subscribeToReconnects = function (callback, onSubscriptionError) {
    var token;
    if (noSubscriptionSupport) return setImmediate(onSubscriptionError);
    token = (nextToken++).toString();
    reconnectCallbacks[token] = callback;
    return token;
  };

  this.unsubscribeFromReconnects = function (token) {
    delete reconnectCallbacks[token];
  };

  this.unsubscribeFromNewHeads = function (token) {
    delete newHeadsCallbacks[token];
  };

  this.simulateReconnect = function () {
    var key;
    newHeadsCallbacks = {};
    if (noSubscriptionSupport) return;
    for (key in reconnectCallbacks) {
      if (reconnectCallbacks.hasOwnProperty(key)) {
        reconnectCallbacks[key]();
      }
    }
  };

  this.simulateNewBlock = function () {
    var key, block = blocks[currentBranch][++currentBlockNumber];
    if (noSubscriptionSupport) return;
    for (key in newHeadsCallbacks) {
      if (newHeadsCallbacks.hasOwnProperty(key)) {
        newHeadsCallbacks[key](block);
      }
    }
  };

  this.simulateRepublishBlock = function () {
    var key, block = blocks[currentBranch][currentBlockNumber];
    if (noSubscriptionSupport) return;
    for (key in newHeadsCallbacks) {
      if (newHeadsCallbacks.hasOwnProperty(key)) {
        newHeadsCallbacks[key](block);
      }
    }
  };

  this.simulateSkippedBlock = function () {
    var key, block;
    currentBlockNumber += 2;
    block = blocks[currentBranch][currentBlockNumber];
    if (noSubscriptionSupport) return;
    for (key in newHeadsCallbacks) {
      if (newHeadsCallbacks.hasOwnProperty(key)) {
        newHeadsCallbacks[key](block);
      }
    }
  };

  this.simulateReorg = function (newBranch, newBlockNumber) {
    currentBranch = newBranch;
    currentBlockNumber = newBlockNumber;
    this.simulateRepublishBlock();
  }.bind(this);

  this.simulateBlockPush = function (block) {
    var key;
    for (key in newHeadsCallbacks) {
      if (newHeadsCallbacks.hasOwnProperty(key)) {
        newHeadsCallbacks[key](block);
      }
    }
  };

  this.getCurrentBlock = function () {
    return blocks[currentBranch][currentBlockNumber];
  };
}

module.exports = MockTransport;
