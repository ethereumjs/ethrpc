"use strict";

var eth = require("../wrappers/eth");
var addNewHeadsSubscription = require("../subscriptions/add-new-heads-subscription");
var removeSubscription = require("../subscriptions/remove-subscription");
var errorSplittingWrapper = require("../errors/error-splitting-wrapper");
var noop = require("../utils/noop");

var nextToken = 1;
var subscriptionMapping = {};

function createTransportAdapter(transporter) {
  return function (dispatch) {
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
        return transporter.addReconnectListener(onReconnect);
      },
      unsubscribeFromReconnects: function (token) {
        transporter.removeReconnectListener(token);
      },
      subscribeToNewHeads: function (onNewHead, onSubscriptionError) {
        var token = (nextToken++).toString();
        subscriptionMapping[token] = null;
        dispatch(eth.subscribe(["newHeads", {}], function (subscriptionID) {
          if (!subscriptionID || subscriptionID.error) {
            return onSubscriptionError(subscriptionID);
          }
          // if the caller already unsubscribed by the time this callback is
          // called, we need to unsubscribe from the remote
          if (subscriptionMapping[token] === undefined) {
            dispatch(eth.unsubscribe(subscriptionID, noop));
          } else {
            subscriptionMapping[token] = subscriptionID;
            dispatch(addNewHeadsSubscription(subscriptionID, onNewHead));
          }
        }));
        return token;
      },
      unsubscribeFromNewHeads: function (token) {
        var subscriptionID;
        if (token) {
          subscriptionID = subscriptionMapping[token];
          delete subscriptionMapping[token];
          dispatch(removeSubscription(subscriptionID));
          dispatch(eth.unsubscribe(subscriptionID, noop));
        }
      }
    };
  };
}

module.exports = createTransportAdapter;
