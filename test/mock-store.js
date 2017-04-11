"use strict";

var redux = require("redux");
var thunk = require("redux-thunk").default;
var reducer = require("../src/reducers");

var mockStore = function (state) {
  return redux.createStore(reducer, state, redux.applyMiddleware(thunk));
};

module.exports = mockStore;
