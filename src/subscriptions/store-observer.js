"use strict";

var immutableDelete = require("immutable-delete");
var isFunction = require("../utils/is-function");

var initialCount = 1;

var count = initialCount;
var unsubscribeFunctions = {};

function addStoreListener(select, onStateChange) {
  return function (dispatch, getState, subscribe) {
    var currentState;
    function handleStateChange() {
      var nextState = select(getState());
      if (nextState !== currentState) {
        onStateChange(nextState, currentState);
        currentState = nextState;
      }
    }
    if (isFunction(subscribe)) unsubscribeFunctions[count] = subscribe(handleStateChange);
    handleStateChange();
    console.log("unsubscribeFunctions:", unsubscribeFunctions);
    return count++;
  };
}

function removeStoreListener(id) {
  console.log("removing listener:", id, unsubscribeFunctions[id]);
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
