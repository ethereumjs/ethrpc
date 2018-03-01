"use strict";

var eth_gasPrice = require("./eth").gasPrice;
var isHex = require("../utils/is-hex");
var isFunction = require("../utils/is-function");
var errors = require("../errors/codes");

function setGasPrice(callback) {
  return function (dispatch) {
    dispatch(eth_gasPrice(null, function (err, gasPrice) {
      if (err) return callback(err);
      if (gasPrice != null && isHex(gasPrice)) {
        dispatch({ type: "SET_GAS_PRICE", gasPrice: parseInt(gasPrice, 16) });
      }
      callback(null);
    }));
  };
}

module.exports = setGasPrice;
