"use strict";

var assign = require("lodash.assign");
var clone = require("clone");
var isObject = require("../utils/is-object");

var initialState = {};

module.exports = function (transactions, action) {
  var updatedTransactions;
  if (typeof transactions === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "ADD_TRANSACTION":
      updatedTransactions = clone(transactions);
      updatedTransactions[action.hash] = action.transaction;
      return updatedTransactions;
    case "UPDATE_TRANSACTION":
      updatedTransactions = {};
      updatedTransactions[action.hash] = assign({}, transactions[action.hash], Object.keys(action.data).reduce(function (p, key) {
        if (isObject(action.data[key])) {
          p[key] = assign({}, transactions[action.hash][key] || {}, action.data[key]);
        } else {
          p[key] = action.data[key];
        }
        return p;
      }, {}));
      return assign({}, transactions, updatedTransactions);
    case "SET_TRANSACTION_CONFIRMATIONS":
      updatedTransactions = clone(transactions);
      updatedTransactions[action.hash].confirmations = action.currentBlockNumber - updatedTransactions[action.hash].tx.blockNumber;
      return updatedTransactions;
    case "UPDATE_TRANSACTION_BLOCK":
      updatedTransactions = clone(transactions);
      updatedTransactions[action.hash].tx.blockNumber = action.blockNumber;
      updatedTransactions[action.hash].tx.blockHash = action.blockHash;
      return updatedTransactions;
    case "UPDATE_TRANSACTION_STATUS":
      updatedTransactions = clone(transactions);
      updatedTransactions[action.hash].status = action.status;
      return updatedTransactions;
    case "TRANSACTION_FAILED":
      updatedTransactions = clone(transactions);
      updatedTransactions[action.hash].status = "failed";
      return updatedTransactions;
    case "TRANSACTION_MINED":
      updatedTransactions = clone(transactions);
      updatedTransactions[action.hash].status = "mined";
      return updatedTransactions;
    case "TRANSACTION_RESUBMITTED":
      updatedTransactions = clone(transactions);
      updatedTransactions[action.hash].status = "resubmitted";
      return updatedTransactions;
    case "TRANSACTION_CONFIRMED":
      updatedTransactions = clone(transactions);
      updatedTransactions[action.hash].status = "confirmed";
      return updatedTransactions;
    case "LOCK_TRANSACTION":
      updatedTransactions = clone(transactions);
      updatedTransactions[action.hash].locked = true;
      return updatedTransactions;
    case "UNLOCK_TRANSACTION":
      updatedTransactions = clone(transactions);
      updatedTransactions[action.hash].locked = false;
      return updatedTransactions;
    case "INCREMENT_TRANSACTION_COUNT":
      updatedTransactions = clone(transactions);
      if (updatedTransactions[action.hash].count) {
        updatedTransactions[action.hash].count = 1;
      } else {
        updatedTransactions[action.hash].count++;
      }
      return updatedTransactions;
    case "INCREMENT_TRANSACTION_PAYLOAD_TRIES":
      updatedTransactions = clone(transactions);
      if (!updatedTransactions[action.hash].payload.tries) {
        updatedTransactions[action.hash].payload.tries = 1;
      } else {
        updatedTransactions[action.hash].payload.tries++;
      }
      return updatedTransactions;
    case "REMOVE_TRANSACTION":
      return Object.keys(transactions).reduce(function (p, hash) {
        if (hash === action.hash) {
          if (transactions[hash]) clearTimeout(transactions[action.hash]);
        } else {
          p[hash] = transactions[hash];
        }
        return p;
      }, {});
    case "REMOVE_ALL_TRANSACTIONS":
      return initialState;
    default:
      return transactions;
  }
};
