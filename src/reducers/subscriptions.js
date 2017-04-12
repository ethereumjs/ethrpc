"use strict";

var assign = require("lodash.assign");

var initialState = {};

module.exports = function (subscriptions, action) {
  var subscription;
  if (typeof subscriptions === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "ADD_SUBSCRIPTION":
      subscription = {};
      subscription[action.id] = action.callback;
      return assign({}, subscriptions, subscription);
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
