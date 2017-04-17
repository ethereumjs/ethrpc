"use strict";

var createStore = require("redux").createStore;
var thunkSubscribeEnhancer = require("redux-thunk-subscribe");
var reducer = require("../src/reducers");

var mockStore = function (state) {
  return createStore(reducer, state, thunkSubscribeEnhancer);
};

module.exports = mockStore;
