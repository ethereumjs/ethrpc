"use strict";

var eth = require("../wrappers/eth");
var addNewHeadsSubscription = require("../subscriptions/add-new-heads-subscription");
var removeSubscription = require("../subscriptions/remove-subscription");
var errorSplittingWrapper = require("../errors/error-splitting-wrapper");
var noop = require("../utils/noop");

var newHeadsSubscription;

function createTransportAdapter() {
  return function (dispatch, getState) {
    return {
      getLatestBlock: function (callback) {
        dispatch(eth.getBlockByNumber(["latest", false], errorSplittingWrapper(callback)));
      },
      getBlockByHash: function (hash, callback) {
        dispatch(eth.getBlockByHash([hash, false], errorSplittingWrapper(callback)));
      },
      getLogs: function (filters, callback) {
        dispatch(eth.getLogs(filters, errorSplittingWrapper(callback)));
      },
      subscribeToReconnects: function (onReconnect) {
        return dispatch(addReconnectListener(onReconnect));
      },
      unsubscribeFromReconnects: function (token) {
        dispatch(removeReconnectListener(token));
      },
      subscribeToNewHeads: function (onNewHead, onSubscriptionError) {
        newHeadsSubscription = null;
        dispatch(eth.subscribe(["newHeads", {}], function (subscriptionID) {
          if (!subscriptionID || subscriptionID.error) {
            return onSubscriptionError(subscriptionID);
          }
          // if the caller already unsubscribed by the time this callback is
          // called, we need to unsubscribe from the remote
          if (newHeadsSubscription === undefined) {
            dispatch(eth.unsubscribe(subscriptionID, noop));
          } else {
            newHeadsSubscription = subscriptionID;
            dispatch(addNewHeadsSubscription(subscriptionID, onNewHead));
          }
        }));
        return subscriptionID;
      },
      unsubscribeFromNewHeads: function (subscriptionID) {
        newHeadsSubscription = undefined;
        dispatch(removeSubscription(subscriptionID));
        dispatch(eth.unsubscribe(subscriptionID, noop));
      }
    };
  };
}

module.exports = createTransportAdapter;
