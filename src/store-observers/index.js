"use strict";

var { assign } = require("lodash");
var immutableDelete = require("immutable-delete");
var isFunction = require("../utils/is-function");

var initialCount = 1;

var count = initialCount;
var unsubscribeFunctions = {};

function subscribeToStateChanges(select, onStateChange) {
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

function unsubscribeFromStateChanges(id) {
  if (isFunction(unsubscribeFunctions[id])) unsubscribeFunctions[id]();
  unsubscribeFunctions = immutableDelete(unsubscribeFunctions, id);
  return count--;
}

function unsubscribeFromAllStateChanges() {
  Object.keys(unsubscribeFunctions).map(unsubscribeFromStateChanges);
  count = initialCount;
}

module.exports.add = function (id, reaction, select, onStateChange) {
  return function (dispatch) {
    dispatch({
      type: "ADD_STORE_OBSERVER",
      id: id,
      reaction: reaction,
      unsubscribeToken: dispatch(subscribeToStateChanges(select, onStateChange)),
    });
  };
};

module.exports.remove = function (id) {
  return function (dispatch, getState) {
    var storeObserver = getState().storeObservers[id];
    if (storeObserver && storeObserver.unsubscribeToken != null) {
      unsubscribeFromStateChanges(storeObserver.unsubscribeToken);
    }
    dispatch({ type: "REMOVE_STORE_OBSERVER", id: id });
  };
};

module.exports.removeAll = function () {
  return function (dispatch) {
    unsubscribeFromAllStateChanges();
    dispatch({ type: "REMOVE_ALL_STORE_OBSERVERS" });
  };
};
