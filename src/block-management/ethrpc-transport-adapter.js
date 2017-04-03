"use strict";

var nextToken = 1;
var subscriptionMapping = {};

function errorSplittingWrapper(callback) {
  return function (errorOrResult) {
    if (!errorOrResult) return callback(undefined, errorOrResult);
    if (errorOrResult instanceof Error) return callback(errorOrResult, undefined);
    if (errorOrResult.error) return callback(errorOrResult, undefined);
    return callback(undefined, errorOrResult);
  };
}

module.exports = function (ethrpc) {
  return {
    getLatestBlock: function (callback) { ethrpc.getBlockByNumber("latest", false, errorSplittingWrapper(callback)); },
    getBlockByHash: function (hash, callback) { ethrpc.getBlockByHash(hash, false, errorSplittingWrapper(callback)); },
    getLogs: function (filters, callback) { ethrpc.getLogs(filters, errorSplittingWrapper(callback)); },
    subscribeToReconnects: function (onReconnect) { return ethrpc.internalState.transporter.addReconnectListener(onReconnect); },
    unsubscribeFromReconnects: function (token) { ethrpc.internalState.transporter.removeReconnectListener(token); },
    subscribeToNewHeads: function (onNewHead, onSubscriptionError) {
      var token = (nextToken++).toString();
      subscriptionMapping[token] = null;
      ethrpc.subscribeNewHeads(function (subscriptionId) {
        if (subscriptionId instanceof Error || subscriptionId.error) return onSubscriptionError(subscriptionId);
        // it is possible the caller already unsubscribed by the time this callback is called, in which case we need to unsubscribe from the remote
        if (subscriptionMapping[token] === undefined) {
          ethrpc.unsubscribe(subscriptionId, function () { });
          return;
        }
        subscriptionMapping[token] = subscriptionId;
        ethrpc.internalState.subscriptions[subscriptionId] = onNewHead;
      });
      return token;
    },
    unsubscribeFromNewHeads: function (token) {
      if (!token) return;
      var subscriptionId = subscriptionMapping[token];
      delete subscriptionMapping[token];
      delete ethrpc.internalState.subscriptions[subscriptionId];
      if (!subscriptionId) return;
      // we don't care about the result, this unsubscribe is just to be nice to the remote host
      ethrpc.unsubscribe(subscriptionId, function () { });
    },
  };
};
