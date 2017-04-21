"use strict";

var debugReducer = require("./debug");
var configurationReducer = require("./configuration");
var currentBlockReducer = require("./current-block");
var highestNonceReducer = require("./highest-nonce");
var gasPriceReducer = require("./gas-price");
var noRelayReducer = require("./no-relay");
var networkIDReducer = require("./network-id");
var transactionsReducer = require("./transactions");
var subscriptionsReducer = require("./subscriptions");
var coinbaseReducer = require("./coinbase");

function reducer(state, action) {
  return {
    debug: debugReducer(state.debug, action),
    configuration: configurationReducer(state.configuration, action),
    currentBlock: currentBlockReducer(state.currentBlock, action),
    highestNonce: highestNonceReducer(state.highestNonce, action),
    gasPrice: gasPriceReducer(state.gasPrice, action),
    noRelay: noRelayReducer(state.noRelay, action),
    networkID: networkIDReducer(state.networkID, action),
    transactions: transactionsReducer(state.transactions, action),
    subscriptions: subscriptionsReducer(state.subscriptions, action),
    coinbase: coinbaseReducer(state.coinbase, action)
  };
}

module.exports = function (state, action) {
  if (action.type === "RESET_STATE") {
    return reducer({}, action);
  }
  return reducer(state || {}, action);
};
