"use strict";

var assign = require("lodash.assign");

var initialState = {};

module.exports = function (subscriptions, action) {
  var newSubscription;
  if (typeof subscriptions === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "ADD_SUBSCRIPTION":
      newSubscription = {};
      newSubscription[action.id] = action.callback;
      return assign({}, subscriptions, newSubscription);
    case "REMOVE_SUBSCRIPTION":
      return Object.keys(subscriptions).reduce(function (p, id) {
        if (id !== action.id) p[id] = subscriptions[id];
        return p;
      }, {});
    case "REMOVE_ALL_SUBSCRIPTIONS":
      return initialState;
    default:
      return subscriptions;
  }
};
