"use strict";

var eth_gasPrice = require("./eth").gasPrice;
var isHex = require("../utils/is-hex");
var isFunction = require("../utils/is-function");

function setGasPrice(callback) {
  return function (dispatch) {
    dispatch(eth_gasPrice(null, function (gasPrice) {
      if (gasPrice != null && !gasPrice.error && isHex(gasPrice)) {
        dispatch({ type: "SET_GAS_PRICE", gasPrice: parseInt(gasPrice, 16) });
      }
      if (isFunction(callback)) callback(null);
    }));
  };
}

module.exports = setGasPrice;
