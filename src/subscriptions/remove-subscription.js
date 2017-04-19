"use strict";

var removeStoreListener = require("./store-observer").removeStoreListener;

function removeSubscription(id) {
  return function (dispatch, getState) {
    var subscription = getState().subscriptions[id];
    if (subscription && subscription.unsubscribeToken != null) {
      removeStoreListener(subscription.unsubscribeToken);
    }
    dispatch({ type: "REMOVE_SUBSCRIPTION", id: id });
  };
}

module.exports = removeSubscription;
