/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var { assign } = require("lodash");
var defaultReducer = require("../../src/reducers");
var composeReducers = require("../../src/reducers/compose-reducers");
var initialState = {
  ethrpc: require("../../src/reducers/initial-state"),
  boom: false,
  todos: [],
};

function boomReducer(boom, action) {
  if (typeof boom === "undefined") {
    return false;
  }
  switch (action.type) {
    case "BOOM":
      return true;
    default:
      return boom;
  }
}

function todosReducer(todos, action) {
  if (typeof todos === "undefined") {
    return [];
  }
  switch (action.type) {
    case "ADD_TODO":
      return todos.concat([action.text]);
    default:
      return todos;
  }
}

function customReducer(state, action) {
  return {
    todos: todosReducer(state.todos, action),
    boom: boomReducer(state.boom, action),
  };
}

describe("reducers/compose-reducers", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(composeReducers(t.params.customReducer, t.params.reducer));
    });
  };
  test({
    description: "composed reducers should update ethrpc and external state",
    params: {
      customReducer: customReducer,
      reducer: defaultReducer,
    },
    assertions: function (reducer) {
      var state = reducer(initialState, { type: "SET_NETWORK_ID", networkID: "3" });
      state = reducer(state, { type: "BOOM" });
      state = reducer(state, { type: "ADD_TODO", text: "breakdance" });
      assert.deepEqual(state, assign({}, initialState, {
        boom: true,
        todos: ["breakdance"],
        ethrpc: assign({}, initialState.ethrpc, { networkID: "3" }),
      }));
      state = reducer(state, { type: "RESET_STATE" });
      assert.deepEqual(state, assign({}, state, {
        ethrpc: assign({}, state.ethrpc, initialState.ethrpc),
      }));
    },
  });
});
