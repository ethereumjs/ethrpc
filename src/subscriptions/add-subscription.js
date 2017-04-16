"use strict";

var addStoreListener = require("../store-observer").addStoreListener;

function addSubscription(id, select, callback) {
  return function (dispatch) {
    dispatch({
      type: "ADD_SUBSCRIPTION",
      id: id,
      unsubscribeToken: dispatch(addStoreListener(select, callback))
    });
  };
}

module.exports = addSubscription;
