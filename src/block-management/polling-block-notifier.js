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

  var processNewBlock = function (newBlock) {
    validateBlock(newBlock);
    this.notifySubscribers(newBlock);
  }.bind(this);

  var pollForLatestBlock = function() {
    transport.getBlockByNumber("latest", false, processNewBlock);
  }.bind(this);

  pollingIntervalToken = setInterval(pollForLatestBlock, pollingIntervalMilliseconds);
}

PollingBlockNotifier.prototype = Object.create(Notifier.prototype);
PollingBlockNotifier.prototype.constructor = PollingBlockNotifier;

module.exports = PollingBlockNotifier;
