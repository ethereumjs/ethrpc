"use strict";

var createEthrpc = require("./create-ethrpc");
var reducer = require("./reducers");
var composeReducers = require("./reducers/compose-reducers");
var version = require("./version");

module.exports = function () {
  var ethrpc = createEthrpc(reducer);
  ethrpc.withCustomReducer = function (customReducer) {
    return createEthrpc(composeReducers(customReducer, reducer));
  };
  ethrpc.lib_version = version;

  return ethrpc;
};
