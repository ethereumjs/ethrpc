"use strict";

var assign = require("lodash.assign");

/**
 * @param {function} customReducer External (user-specified) reducer.
 * @param {function} reducer Default ethrpc reducer.
 */
function composeReducers(customReducer, reducer) {
  return function (state, action) {
    return assign({}, customReducer(state, action), { ethrpc: reducer(state.ethrpc, action) });
  };
}

module.exports = composeReducers;
