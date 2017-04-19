"use strict";

var Notifier = require("./notifier");
var validateBlock = require("../validate/validate-block");

function PollingBlockNotifier(transport, pollingIntervalMilliseconds) {
  var pollingIntervalToken, processNewBlock, pollForLatestBlock;
  Notifier.call(this);

  pollingIntervalToken = null;

  this.destroy = function () {
    this.unsubscribeAll();
    clearInterval(pollingIntervalToken);
  }.bind(this);

  processNewBlock = function (error, newBlock) {
    if (error) return;
    validateBlock(newBlock);
    this.notifySubscribers(newBlock);
  }.bind(this);

  pollForLatestBlock = function () {
    transport.getLatestBlock(processNewBlock);
  };

  pollingIntervalToken = setInterval(pollForLatestBlock, pollingIntervalMilliseconds);
}

PollingBlockNotifier.prototype = Object.create(Notifier.prototype);
PollingBlockNotifier.prototype.constructor = PollingBlockNotifier;

module.exports = PollingBlockNotifier;
