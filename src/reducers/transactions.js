"use strict";

var assign = require("lodash.assign");
var immutableDelete = require("immutable-delete");
var isObject = require("../utils/is-object");
var initialState = require("./initial-state").transactions;

module.exports = function (transactions, action) {
  if (typeof transactions === "undefined") {
    return initialState;
  }
  var newTransaction;
  switch (action.type) {
    case "ADD_TRANSACTION":
      newTransaction = {};
      newTransaction[action.transaction.hash] = action.transaction;
      return assign({}, transactions, newTransaction);
    case "UPDATE_TRANSACTION":
      if (transactions[action.hash] == null) return transactions;
      newTransaction = {};
      newTransaction[action.hash] = assign({}, transactions[action.hash], Object.keys(action.data).reduce(function (p, key) {
        if (isObject(action.data[key])) {
          p[key] = assign({}, transactions[action.hash][key] || {}, action.data[key]);
        } else {
          p[key] = action.data[key];
        }
        return p;
      }, {}));
      return assign({}, transactions, newTransaction);
    case "UPDATE_ON_CHAIN_TRANSACTION":
      if (transactions[action.hash] == null) return transactions;
      newTransaction = {};
      newTransaction[action.hash] = assign({}, transactions[action.hash], {
        tx: assign({}, transactions[action.hash].tx || {}, action.data || {}),
      });
      return assign({}, transactions, newTransaction);
    case "SET_TRANSACTION_CONFIRMATIONS":
      if (transactions[action.hash] == null) return transactions;
      if (transactions[action.hash].tx.blockNumber == null) return transactions;
      newTransaction = {};
      newTransaction[action.hash] = assign({}, transactions[action.hash], {
        confirmations: action.currentBlockNumber - transactions[action.hash].tx.blockNumber,
      });
      return assign({}, transactions, newTransaction);
    case "TRANSACTION_PENDING":
      if (transactions[action.hash] == null) return transactions;
      newTransaction = {};
      newTransaction[action.hash] = assign({}, transactions[action.hash], { status: "pending" });
      return assign({}, transactions, newTransaction);
    case "TRANSACTION_FAILED":
      if (transactions[action.hash] == null) return transactions;
      newTransaction = {};
      newTransaction[action.hash] = assign({}, transactions[action.hash], { status: "failed" });
      return assign({}, transactions, newTransaction);
    case "TRANSACTION_SEALED":
      if (transactions[action.hash] == null) return transactions;
      newTransaction = {};
      newTransaction[action.hash] = assign({}, transactions[action.hash], { status: "sealed" });
      return assign({}, transactions, newTransaction);
    case "TRANSACTION_RESUBMITTED":
      if (transactions[action.hash] == null) return transactions;
      newTransaction = {};
      newTransaction[action.hash] = assign({}, transactions[action.hash], { status: "resubmitted" });
      return assign({}, transactions, newTransaction);
    case "TRANSACTION_CONFIRMED":
      if (transactions[action.hash] == null) return transactions;
      newTransaction = {};
      newTransaction[action.hash] = assign({}, transactions[action.hash], { status: "confirmed" });
      return assign({}, transactions, newTransaction);
    case "LOCK_TRANSACTION":
      if (transactions[action.hash] == null) return transactions;
      newTransaction = {};
      newTransaction[action.hash] = assign({}, transactions[action.hash], { isLocked: true });
      return assign({}, transactions, newTransaction);
    case "UNLOCK_TRANSACTION":
      if (transactions[action.hash] == null) return transactions;
      newTransaction = {};
      newTransaction[action.hash] = assign({}, transactions[action.hash], { isLocked: false });
      return assign({}, transactions, newTransaction);
    case "INCREMENT_TRANSACTION_COUNT":
      if (transactions[action.hash] == null) return transactions;
      newTransaction = {};
      newTransaction[action.hash] = assign({}, transactions[action.hash], {
        count: (transactions[action.hash].count) ? transactions[action.hash].count + 1 : 1,
      });
      return assign({}, transactions, newTransaction);
    case "INCREMENT_TRANSACTION_PAYLOAD_TRIES":
      if (transactions[action.hash] == null) return transactions;
      var payload = transactions[action.hash].payload || {};
      newTransaction = {};
      newTransaction[action.hash] = assign({}, transactions[action.hash], {
        payload: assign({}, payload, { tries: (payload.tries) ? payload.tries + 1 : 1 }),
      });
      return assign({}, transactions, newTransaction);
    case "REMOVE_TRANSACTION":
      return immutableDelete(transactions, action.hash);
    case "REMOVE_ALL_TRANSACTIONS":
      return initialState;
    default:
      return transactions;
  }
};
