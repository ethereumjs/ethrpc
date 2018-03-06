"use strict";

var eth = require("../wrappers/eth");
var addNewHeadsSubscription = require("../subscriptions/add-new-heads-subscription");
var removeSubscription = require("../subscriptions/remove-subscription");
var logError = require("../utils/log-error");

var nextToken = 1;
var subscriptionMapping = {};

function createTransportAdapter(transporter) {
  return function (dispatch) {
    return {
      getLatestBlock: function (callback) {
        dispatch(eth.getBlockByNumber(["latest", false], callback));
      },
      getBlockByHash: function (hash, callback) {
        dispatch(eth.getBlockByHash([hash, false], callback));
      },
      getBlockByNumber: function (blockNumber, callback) {
        dispatch(eth.getBlockByNumber([blockNumber, false], callback));
      },
      getLogs: function (filters, callback) {
        dispatch(eth.getLogs(filters, callback));
      },
      subscribeToReconnects: function (onReconnect) {
        return transporter.addReconnectListener(onReconnect);
      },
      unsubscribeFromReconnects: function (token) {
        transporter.removeReconnectListener(token);
      },
      subscribeToDisconnects: function (onDisconnect) {
        return transporter.addDisconnectListener(onDisconnect);
      },
      unsubscribeFromDisconnects: function (token) {
        transporter.removeDisconnectListener(token);
      },
      subscribeToNewHeads: function (onNewHead, onSubscriptionError) {
        var token = (nextToken++).toString();
        subscriptionMapping[token] = null;
        dispatch(eth.subscribe(["newHeads"], function (err, subscriptionID) {
          if (err) return onSubscriptionError(err);
          if (!subscriptionID) return onSubscriptionError(subscriptionID);

          // if the caller already unsubscribed by the time this callback is
          // called, we need to unsubscribe from the remote
          if (subscriptionMapping[token] === undefined) {
            dispatch(eth.unsubscribe(subscriptionID, logError));
          } else {
            subscriptionMapping[token] = subscriptionID;
            dispatch(addNewHeadsSubscription(subscriptionID, onNewHead));
          }
        }));
        return token;
      },
      unsubscribeFromNewHeads: function (token) {
        if (token) {
          var subscriptionID = subscriptionMapping[token];
          delete subscriptionMapping[token];
          if (subscriptionID != null) {
            dispatch(removeSubscription(subscriptionID));
            dispatch(eth.unsubscribe(subscriptionID, logError));
          }
        }
      },
    };
  };
}

module.exports = createTransportAdapter;
