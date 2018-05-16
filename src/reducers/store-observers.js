"use strict";

var { assign } = require("lodash");
var immutableDelete = require("immutable-delete");
var initialState = require("./initial-state").storeObservers;

module.exports = function (storeObservers, action) {
  var newStoreObserver;
  if (typeof storeObservers === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "ADD_STORE_OBSERVER":
      newStoreObserver = {};
      newStoreObserver[action.id] = {
        reaction: action.reaction,
        unsubscribeToken: action.unsubscribeToken,
      };
      return assign({}, storeObservers, newStoreObserver);
    case "REMOVE_STORE_OBSERVER":
      return immutableDelete(storeObservers, action.id);
    case "REMOVE_ALL_STORE_OBSERVERS":
      return initialState;
    default:
      return storeObservers;
  }
};
