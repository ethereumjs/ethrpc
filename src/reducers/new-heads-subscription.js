"use strict";

var assign = require("lodash").assign;
var initialState = require("./initial-state").newHeadsSubscription;

module.exports = function (newHeadsSubscription, action) {
  if (typeof newHeadsSubscription === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_NEW_HEADS_SUBSCRIPTION":
      return assign({}, newHeadsSubscription, action.newHeadsSubscription);
    case "CLEAR_NEW_HEADS_SUBSCRIPTION":
      return initialState;
    default:
      return newHeadsSubscription;
  }
};
