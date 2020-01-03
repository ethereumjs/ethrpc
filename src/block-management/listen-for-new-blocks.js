"use strict";

var startPollingForBlocks = require("./start-polling-for-blocks");
var subscribeToNewBlockNotifications = require("./subscribe-to-new-block-notifications");
var unsubscribeFromNewBlockNotifications = require("./unsubscribe-from-new-block-notifications");
var isMetaMask = require("../utils/is-meta-mask");

function listenForNewBlocks() {
  return function (dispatch) {
    if (isMetaMask()) { // MetaMask doesn't throw an error on eth_subscribe, but doesn't actually send block notifications, so we need to poll instead...
      dispatch(startPollingForBlocks());
    } else {
      dispatch(subscribeToNewBlockNotifications(function (err) {
        console.info("[ethrpc] eth_subscribe request failed, fall back to polling for blocks:", err.message);
        dispatch(unsubscribeFromNewBlockNotifications());
        dispatch(startPollingForBlocks());
      }));
    }
  };
}

module.exports = listenForNewBlocks;
