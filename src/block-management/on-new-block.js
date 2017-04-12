"use strict";

var reprocessTransactions = require("../transact/reprocess-transactions");

function onNewBlock(block) {
  return function (dispatch) {
    if (typeof block !== "object") throw new Error("block must be an object");
    block.number = parseInt(block.number, 16);
    dispatch({ type: "UPDATE_CURRENT_BLOCK", block: block });
    dispatch(reprocessTransactions());
  };
}

module.exports = onNewBlock;
