"use strict";

var isFunction = require("./utils/is-function");
var immutableDelete = require("immutable-delete");

var initialCount = 1;

var count = initialCount;
var unsubscribe = {};

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
    if (isFunction(subscribe)) unsubscribe[count] = subscribe(handleStateChange);
    handleStateChange();
    console.log(unsubscribe);
    return count++;
  };
}

function removeStoreListener(id) {
  // console.log('removing listener:', id, unsubscribe[id]);
  if (isFunction(unsubscribe[id])) unsubscribe[id]();
  unsubscribe = immutableDelete(unsubscribe, id);
}

function removeAllStoreListeners() {
  Object.keys(unsubscribe).map(removeStoreListener);
  count = initialCount;
}

module.exports.addStoreListener = addStoreListener;
module.exports.removeStoreListener = removeStoreListener;
module.exports.removeAllStoreListeners = removeAllStoreListeners;
