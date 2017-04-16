"use strict";

var removeStoreListener = require("../store-observer").removeStoreListener;

function removeSubscription(id) {
  return function (dispatch, getState) {
    // console.log('removing subscription:', id, getState().subscriptions[id])
    removeStoreListener(getState().subscriptions[id]);
    dispatch({ type: "REMOVE_SUBSCRIPTION", id: id });
  };
}

module.exports = removeSubscription;
