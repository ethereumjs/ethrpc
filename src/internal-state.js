"use strict";

var assign = require("lodash.assign");
var get = require("lodash.get");
var set = require("lodash.set");
var unset = require("lodash.unset");

var state = {};

module.exports.getState = function () { return state; };
module.exports.get = function (path) { return get(state, path); };
module.exports.setState = function (newState) { assign(state, newState); };
module.exports.set = function (path, newState) { set(state, path, newState); };
module.exports.unset = function (path) { unset(state, path); };
