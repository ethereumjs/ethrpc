"use strict";

var assign = require("lodash.assign");
var immutableDelete = require("immutable-delete");
var isFunction = require("../utils/is-function");

var initialCount = 1;

var count = initialCount;
var unsubscribeFunctions = {};

function addStoreListener(select, onStateChange) {
  return function (dispatch, getState, subscribe) {
    var prevState, currentState = select(getState());
    function handleStateChange() {
      var nextState = select(getState());
      if (nextState !== currentState) {
        prevState = assign({}, currentState);
        currentState = nextState;
        onStateChange(currentState, prevState);
      }
    }
    if (isFunction(subscribe)) {
      unsubscribeFunctions[count] = subscribe(handleStateChange);
    }
    handleStateChange();
    return count++;
  };
}

function removeStoreListener(id) {
  if (isFunction(unsubscribeFunctions[id])) unsubscribeFunctions[id]();
  unsubscribeFunctions = immutableDelete(unsubscribeFunctions, id);
}

function removeAllStoreListeners() {
  Object.keys(unsubscribeFunctions).map(removeStoreListener);
  count = initialCount;
}

module.exports.addStoreListener = addStoreListener;
module.exports.removeStoreListener = removeStoreListener;
module.exports.removeAllStoreListeners = removeAllStoreListeners;
