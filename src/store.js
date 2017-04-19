"use strict";

module.exports = require("redux").createStore(require("./reducers"), require("redux-thunk-subscribe"));
