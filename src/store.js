"use strict";

var createStore = require("redux").createStore;

module.exports = createStore(require("./reducers"), require("redux-thunk-subscribe"));
