"use strict";

var assign = require("lodash.assign");
var reprocessTransactions = require("../transact/reprocess-transactions");
var isObject = require("../utils/is-object");

function onNewBlock(block) {
  return function (dispatch) {
    if (isObject(block)) {
      dispatch({
        type: "SET_CURRENT_BLOCK",
        block: assign({}, block, { number: parseInt(block.number, 16) })
      });
      dispatch(reprocessTransactions());
    }
  };
}

module.exports = onNewBlock;
