"use strict";

var redux = require("redux");
var thunk = require("redux-thunk").default;
var reducer = require("./reducers");

var store = redux.createStore(reducer, redux.applyMiddleware(thunk));

module.exports = store;
