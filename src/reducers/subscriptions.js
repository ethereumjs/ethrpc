"use strict";

var assign = require("lodash.assign");
var immutableDelete = require("immutable-delete");
var initialState = require("./initial-state").subscriptions;

module.exports = function (subscriptions, action) {
  var newSubscription;
  if (typeof subscriptions === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "ADD_SUBSCRIPTION":
      // console.log('ADD_SUBSCRIPTION:', subscriptions, action.id, action.reaction, action.unsubscribeToken);
      newSubscription = {};
      newSubscription[action.id] = {
        reaction: action.reaction,
        unsubscribeToken: action.unsubscribeToken
      };
      return assign({}, subscriptions, newSubscription);
    case "REMOVE_SUBSCRIPTION":
      return immutableDelete(subscriptions, action.id);
    case "REMOVE_ALL_SUBSCRIPTIONS":
      return initialState;
    default:
      return subscriptions;
  }
};
