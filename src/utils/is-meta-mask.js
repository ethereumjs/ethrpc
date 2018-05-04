"use strict";

var isGlobalWeb3 = require("./is-global-web3");

function isMetaMask() {
  if (!isGlobalWeb3()) return false;
  if (!window.web3.currentProvider.isMetaMask) return false;
  return true;
}

module.exports = isMetaMask;
