"use strict";

var debugReducer = require("./debug");

var configurationReducer = require("./configuration");
var currentBlockReducer = require("./current-block");
var highestNonceReducer = require("./highest-nonce");
var gasPriceReducer = require("./gas-price");
var noRelayReducer = require("./no-relay");
var notificationsReducer = require("./notifications");
var transactionRelayReducer = require("./transaction-relay");
var transactionsReducer = require("./transactions");

var transporterReducer = require("./transporter");
var blockNotifierReducer = require("./block-notifier");
var blockAndLogStreamerReducer = require("./block-and-log-streamer");
var outstandingRequestsReducer = require("./outstanding-requests");
var subscriptionsReducer = require("./subscriptions");
var newBlockIntervalTimeoutIdReducer = require("./new-block-interval-timeout-id");
var shimMessageHandlerObjectReducer = require("./shim-message-handler-object");
var shimMessageHandlerReducer = require("./shim-message-handler");

function reducer(state, action) {
  return {
    debug: debugReducer(state.debug, action),

    configuration: configurationReducer(state.configuration, action),
    currentBlock: currentBlockReducer(state.block, action),
    highestNonce: highestNonceReducer(state.highestNonce, action),
    gasPrice: gasPriceReducer(state.gasPrice, action),
    noRelay: noRelayReducer(state.noRelay, action),
    notifications: notificationsReducer(state.notifications, action),
    transactionRelay: transactionRelayReducer(state.transactionRelay, action),
    transactions: transactionsReducer(state.transactions, action),

    transporter: transporterReducer(state.transporter, action),
    blockNotifier: blockNotifierReducer(state.blockNotifier, action),
    blockAndLogStreamer: blockAndLogStreamerReducer(state.blockAndLogStreamer, action),
    outstandingRequests: outstandingRequestsReducer(state.outstandingRequests, action),
    subscriptions: subscriptionsReducer(state.subscriptions, action),
    newBlockIntervalTimeoutId: newBlockIntervalTimeoutIdReducer(state.newBlockIntervalTimeoutId, action),
    shimMessageHandlerObject: shimMessageHandlerObjectReducer(state.shimMessageHandlerObject, action),
    shimMessageHandler: shimMessageHandlerReducer(state.shimMessageHandler, action)
  };
}

module.exports = function (state, action) {
  if (action.type === "RESET_STATE") {
    return reducer({}, action);
  }
  return reducer(state || {}, action);
};
