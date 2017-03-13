"use strict";

var AbstractTransport = require("./abstract-transport.js");

function MetaMaskTransport(messageHandler, initialConnectCallback) {
  AbstractTransport.call(this, "metamask", -1, messageHandler);

  this.initialConnect(initialConnectCallback);
}

MetaMaskTransport.prototype = Object.create(AbstractTransport.prototype);

MetaMaskTransport.prototype.constructor = MetaMaskTransport;

MetaMaskTransport.prototype.connect = function (callback) {
  if (typeof window !== "undefined" && ((window || {}).web3 || {}).currentProvider) {
    setTimeout(function () { callback(null); }, 1);
  } else {
    setTimeout(function () { callback(new Error("Nothing found at window.web3.currentProvider.")); }, 1);
  }
}

MetaMaskTransport.prototype.submitRpcRequest = function (rpcObject, errorCallback) {
  if (typeof window === "undefined") return errorCallback("attempted to access 'window' outside of a browser, this shouldn't happen");
  var web3Provider = ((window || {}).web3 || {}).currentProvider;
  if (!web3Provider) return errorCallback("window.web3.currentProvider no longer available.");
  web3Provider.sendAsync(rpcObject, this.messageHandler.bind(this));
}

module.exports = MetaMaskTransport;
