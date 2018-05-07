"use strict";

var storeObservers = require("./");

function selectTransaction(hash) {
  return function (state) {
    return state.transactions[hash];
  };
}

// subscribe to a single transaction
module.exports = function (hash, onStateChange) {
  return function (dispatch) {
    dispatch(storeObservers.add(hash, null, selectTransaction(hash), onStateChange));
  };
};
