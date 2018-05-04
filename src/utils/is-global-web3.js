"use strict";

function isGlobalWeb3() {
  if (typeof window === "undefined") return false;
  if (!window) return false;
  if (!window.web3) return false;
  if (!window.web3.currentProvider) return false;
  return true;
}

module.exports = isGlobalWeb3;
