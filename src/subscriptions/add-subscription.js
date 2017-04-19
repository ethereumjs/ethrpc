"use strict";

var addStoreListener = require("./store-observer").addStoreListener;

function addSubscription(id, reaction, select, onStateChange) {
  return function (dispatch) {
    dispatch({
      type: "ADD_SUBSCRIPTION",
      id: id,
      reaction: reaction,
      unsubscribeToken: dispatch(addStoreListener(select, onStateChange))
    });
  };
}

module.exports = addSubscription;
