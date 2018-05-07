"use strict";

var eth = require("../wrappers/eth");
var internalState = require("../internal-state");
var onNewBlock = require("./on-new-block");
var observeCurrentBlockStateChanges = require("../store-observers/current-block");
var logError = require("../utils/log-error");

// try to subscribe to new blocks using eth_subscribe, fall back to polling if not available
function subscribeToNewBlockNotifications(subscriptionFailedCallback) {
  return function (dispatch, getState) {
    dispatch({ type: "SET_NEW_HEADS_SUBSCRIPTION", newHeadsSubscription: { id: null } });
    dispatch(eth.subscribe(["newHeads", {}], function (err, newHeadsSubscriptionID) {
      if (err || newHeadsSubscriptionID == null) return subscriptionFailedCallback(err);

      // if the caller already unsubscribed by the time this callback is called, unsubscribe from the remote
      if (getState().newHeadsSubscription.id === undefined) {
        dispatch(eth.unsubscribe(newHeadsSubscriptionID, logError));
      } else {
        var reconnectToken = internalState.get("transporter").addReconnectListener(function () {
          dispatch(subscribeToNewBlockNotifications(subscriptionFailedCallback));
        });
        dispatch({ type: "SET_NEW_HEADS_SUBSCRIPTION", newHeadsSubscription: { id: newHeadsSubscriptionID, reconnectToken: reconnectToken } });
        dispatch(observeCurrentBlockStateChanges(newHeadsSubscriptionID, function (currentBlock) {
          dispatch(onNewBlock(currentBlock));
        }));
      }
    }));
  };
}

module.exports = subscribeToNewBlockNotifications;
