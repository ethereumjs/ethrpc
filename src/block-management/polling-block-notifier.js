"use strict";

var Notifier = require("./notifier.js");
var validateBlock = require("./validate-block.js");

function PollingBlockNotifier(transport, pollingIntervalMilliseconds) {
  Notifier.call(this);

  var pollingIntervalToken = null;

  this.destroy = function () {
    this.unsubscribeAll();
    clearInterval(pollingIntervalToken);
  }.bind(this);

  var processNewBlock = function (error, newBlock) {
    if (error) return;
    validateBlock(newBlock);
    this.notifySubscribers(newBlock);
  }.bind(this);

  var pollForLatestBlock = function () {
    transport.getLatestBlock(processNewBlock);
  };

  pollingIntervalToken = setInterval(pollForLatestBlock, pollingIntervalMilliseconds);
}

PollingBlockNotifier.prototype = Object.create(Notifier.prototype);
PollingBlockNotifier.prototype.constructor = PollingBlockNotifier;

module.exports = PollingBlockNotifier;
