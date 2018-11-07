"use strict";

var Promise = require("es6-promise").Promise;
var BlockAndLogStreamer = require("ethereumjs-blockstream").BlockAndLogStreamer;
var eth = require("../wrappers/eth");
var internalState = require("../internal-state");

function createBlockAndLogStreamer() {
  return function (dispatch, getState) {
    internalState.set("blockAndLogStreamer", new BlockAndLogStreamer(function (hash) {
      return new Promise(function (resolve, reject) {
        dispatch(eth.getBlockByHash([hash, false], function (err, block) {
          if (err) return reject(err);
          resolve(block);
        }));
      });
    }, function (filterOptions) {
      return new Promise(function (resolve, reject) {
        dispatch(eth.getLogs(filterOptions, function (err, logs) {
          if (err) return reject(err);
          if (logs == null) reject(new Error("Received null/undefined logs and no error."));
          resolve(logs);
        }));
      });
    }, function (err) {
      console.warn(err);
    },
    { blockRetention: getState().configuration.blockRetention }));
  };
}

module.exports = createBlockAndLogStreamer;
