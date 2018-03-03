"use strict";

var updateTx = require("./update-tx");

function reprocessTransactions() {
  return function (dispatch, getState) {
    Object.keys(getState().transactions).forEach(function (transactionHash) {
      dispatch(updateTx.default(transactionHash));
    });
  };
}

module.exports = reprocessTransactions;
