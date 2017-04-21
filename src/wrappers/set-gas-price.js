"use strict";

var eth_gasPrice = require("./eth").gasPrice;
var isHex = require("../utils/is-hex");

function setGasPrice() {
  return function (dispatch) {
    dispatch(eth_gasPrice(null, function (gasPrice) {
      if (gasPrice != null && !gasPrice.error && isHex(gasPrice)) {
        dispatch({ type: "SET_GAS_PRICE", gasPrice: parseInt(gasPrice, 16) });
      }
    }));
  };
}

module.exports = setGasPrice;
