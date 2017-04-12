"use strict";

var eth = require("../wrappers/eth");
var errorSplittingWrapper = require("../errors/error-splitting-wrapper");
var noop = require("../utils/noop");

var nextToken = 1;
var subscriptionMapping = {};

var ethrpcTransportAdapter = function () {
  return function (dispatch, getState) {
    var transporter = getState().transporter;
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
        dispatch(eth.subscribe(["newHeads", null], function (subscriptionID) {
          if (subscriptionID instanceof Error || subscriptionID.error) {
            return onSubscriptionError(subscriptionID);
          }
          // if the caller already unsubscribed by the time this callback is
          // called, we need to unsubscribe from the remote
          if (subscriptionMapping[token] === undefined) {
            dispatch(eth.unsubscribe(subscriptionID, noop));
          } else {
            subscriptionMapping[token] = subscriptionID;
            dispatch({ type: "ADD_SUBSCRIPTION", id: subscriptionID, callback: onNewHead });
            // ethrpc.internalState.subscriptions[subscriptionID] = onNewHead;
          }
        }));
        return token;
      },
      unsubscribeFromNewHeads: function (token) {
        var subscriptionID;
        if (token) {
          subscriptionID = subscriptionMapping[token];
          delete subscriptionMapping[token];
          // delete ethrpc.internalState.subscriptions[subscriptionID];
          dispatch({ type: "REMOVE_SUBSCRIPTION", id: subscriptionID });
          if (subscriptionID) {
            // we don't care about the result, this unsubscribe is just to be
            // nice to the remote host
            dispatch(eth.unsubscribe(subscriptionID, noop));
          }
        }
      }
    };
  };
};
