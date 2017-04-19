"use strict";

var Notifier = require("./notifier.js");
var PollingBlockNotifier = require("./polling-block-notifier.js");
var SubscribingBlockNotifier = require("./subscribing-block-notifier.js");

function BlockNotifier(transport, pollingIntervalMilliseconds) {
  var blockNotifier;
  Notifier.call(this);

  blockNotifier = new SubscribingBlockNotifier(transport, function () {
    blockNotifier.destroy();
    blockNotifier = new PollingBlockNotifier(transport, pollingIntervalMilliseconds);
    blockNotifier.subscribe(this.notifySubscribers);
  }.bind(this));
  blockNotifier.subscribe(this.notifySubscribers);

  this.destroy = function () {
    this.unsubscribeAll();
    blockNotifier.destroy();
  }.bind(this);
}

BlockNotifier.prototype = Object.create(Notifier.prototype);
BlockNotifier.prototype.constructor = BlockNotifier;

module.exports = BlockNotifier;
