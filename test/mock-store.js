"use strict";

var redux = require("redux");
var thunkSubscribeEnhancer = require("redux-thunk-subscribe");
var reducer = require("../src/reducers");

var mockStore = function (state) {
  return redux.createStore(reducer, state, thunkSubscribeEnhancer);
};

module.exports = mockStore;
