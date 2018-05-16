"use strict";

var assign = require("lodash").assign;
var lodash = require("lodash");

var state = {};

module.exports.getState = function () { return state; };
module.exports.get = function (path) { return lodash.get(state, path); };
module.exports.setState = function (newState) { assign(state, newState); };
module.exports.set = function (path, newState) { lodash.set(state, path, newState); };
module.exports.unset = function (path) { lodash.unset(state, path); };
