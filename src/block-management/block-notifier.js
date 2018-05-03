"use strict";

var Notifier = require("./notifier.js");
var PollingBlockNotifier = require("./polling-block-notifier.js");
var SubscribingBlockNotifier = require("./subscribing-block-notifier.js");
var isMetaMask = require("../utils/is-meta-mask");

function BlockNotifier(transport, pollingIntervalMilliseconds) {
  var blockNotifier;
  Notifier.call(this);
  if (isMetaMask()) { // MetaMask doesn't throw an error on eth_subscribe, but doesn't actually send block notifications, so we need to poll instead...
    blockNotifier = new PollingBlockNotifier(transport, pollingIntervalMilliseconds);
  } else {
    blockNotifier = new SubscribingBlockNotifier(transport, function () {
      blockNotifier.destroy();
      blockNotifier = new PollingBlockNotifier(transport, pollingIntervalMilliseconds);
      blockNotifier.subscribe(this.notifySubscribers);
    }.bind(this));
  }
  blockNotifier.subscribe(this.notifySubscribers);
  this.destroy = function () {
    this.unsubscribeAll();
    blockNotifier.destroy();
  }.bind(this);
}

BlockNotifier.prototype = Object.create(Notifier.prototype);
BlockNotifier.prototype.constructor = BlockNotifier;

module.exports = BlockNotifier;
