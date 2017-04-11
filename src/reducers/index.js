"use strict";

var configurationReducer = require("./configuration");
var currentBlockReducer = require("./current-block");
var highestNonceReducer = require("./highest-nonce");
var gasPriceReducer = require("./gas-price");
var noRelayReducer = require("./no-relay");
var notificationsReducer = require("./notifications");
var transactionsReducer = require("./transactions");

var reducer = function (state, action) {
  return {
    configuration: configurationReducer(state.configuration, action),
    currentBlock: currentBlockReducer(state.block, action),
    highestNonce: highestNonceReducer(state.highestNonce, action),
    gasPrice: gasPriceReducer(state.gasPrice, action),
    noRelay: noRelayReducer(state.noRelay, action),
    notifications: notificationsReducer(state.notifications, action),
    transactions: transactionsReducer(state.transactions, action)
  };
};

module.exports = function (state, action) {
  return reducer(state || {}, action);
};
