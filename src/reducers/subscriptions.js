"use strict";

var assign = require("lodash.assign");
var immutableDelete = require("immutable-delete");

var initialState = {};

module.exports = function (subscriptions, action) {
  var newSubscription;
  if (typeof subscriptions === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "ADD_SUBSCRIPTION":
      // console.log('add sub:', subscriptions, action.id, action.unsubscribeToken);
      newSubscription = {};
      newSubscription[action.id] = action.unsubscribeToken;
      return assign({}, subscriptions, newSubscription);
    case "REMOVE_SUBSCRIPTION":
      // console.log('remove sub:', subscriptions, action.id);
      return immutableDelete(subscriptions, action.id);
    case "REMOVE_ALL_SUBSCRIPTIONS":
      return initialState;
    default:
      return subscriptions;
  }
};
