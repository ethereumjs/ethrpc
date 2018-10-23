"use strict";

function isGlobalWeb3() {
  if (typeof window === "undefined") return false;
  if (!window) return false;
  if (!window.ethereum) return false;
  return true;
}

module.exports = isGlobalWeb3;
