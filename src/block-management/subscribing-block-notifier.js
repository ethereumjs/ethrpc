"use strict";

var Notifier = require("./notifier");
var validateBlock = require("../validate/validate-block");

function SubscribingBlockNotifier(transport, onUnrecoverableSubscriptionFailure) {
  var reconnectToken, subscriptionToken, onNewHeadsSubscriptionError, onNewHead, setupSubscriptions, onReconnectsSubscriptionError, onReconnect;
  Notifier.call(this);

  reconnectToken = null;
  subscriptionToken = null;

  this.destroy = function () {
    this.unsubscribeAll();
    if (reconnectToken) transport.unsubscribeFromReconnects(reconnectToken);
    if (subscriptionToken) transport.unsubscribeFromNewHeads(subscriptionToken);
  }.bind(this);

  onNewHeadsSubscriptionError = function () {
    this.destroy();
    onUnrecoverableSubscriptionFailure();
  }.bind(this);

  onNewHead = function (/*blockHeader*/) {
    // unfortunately we have to fetch the new block until https://github.com/ethereum/go-ethereum/issues/13858 is fixed
    transport.getLatestBlock(function (error, newBlock) {
      validateBlock(newBlock);
      this.notifySubscribers(newBlock);
    }.bind(this));
  }.bind(this);

  setupSubscriptions = function () {
    subscriptionToken = transport.subscribeToNewHeads(onNewHead, onNewHeadsSubscriptionError);
  };

  onReconnectsSubscriptionError = function () {
    this.destroy();
    onUnrecoverableSubscriptionFailure();
  }.bind(this);

  onReconnect = function () {
    setupSubscriptions();
  };

  reconnectToken = transport.subscribeToReconnects(onReconnect, onReconnectsSubscriptionError);
  setupSubscriptions();
}

SubscribingBlockNotifier.prototype = Object.create(Notifier.prototype);
SubscribingBlockNotifier.prototype.constructor = SubscribingBlockNotifier;

module.exports = SubscribingBlockNotifier;
