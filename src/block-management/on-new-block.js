"use strict";

var reprocessTransactions = require("../transact/reprocess-transactions");
var isObject = require("../utils/is-object");

function onNewBlock(block) {
  return function (dispatch) {
    if (isObject(block)) {
      dispatch({ type: "SET_CURRENT_BLOCK", data: block });
      dispatch(reprocessTransactions());
    }
  };
}

module.exports = onNewBlock;
