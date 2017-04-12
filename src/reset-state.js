"use strict";

/**
 * Resets the global state of this module to default.
 */
function resetState() {
  return function (dispatch) {
    // var oldMessageHandlerObject, newMessageHandlerObject;

    // stop any pending timers
    dispatch({ type: "CLEAR_NEW_BLOCK_INTERVAL_TIMEOUT_ID" });
    // clearInterval(newBlockIntervalTimeoutID);

    // reset configuration to defaults
    dispatch({ type: "RESET_CONFIGURATION" });
    // this.configuration = {
    //   httpAddresses: [],
    //   wsAddresses: [],
    //   ipcAddresses: [],
    //   connectionTimeout: 3000,
    //   pollingIntervalMilliseconds: 30000,
    //   blockRetention: 100,
    //   errorHandler: null
    // };

    // destroy the old BlockNotifier so it doesn't try to reconnect or continue polling
    dispatch({ type: "CLEAR_BLOCK_NOTIFIER" });
    // (((this.internalState || {}).blockNotifier || {}).destroy || function () {})();

    // redirect any not-yet-received responses to /dev/null
    dispatch({ type: "IGNORE_SHIM_MESSAGE_HANDLER" });
    // oldMessageHandlerObject = (this.internalState || {}).shimMessageHandlerObject || {};
    // oldMessageHandlerObject.realMessageHandler = function () {};
    // newMessageHandlerObject = { realMessageHandler: blockchainMessageHandler };

    // reset state to defaults
    dispatch({ type: "RESET_STATE" });
    // this.internalState = {
    //   transporter: null,
    //   blockNotifier: null,
    //   blockAndLogStreamer: null,
    //   outstandingRequests: {},
    //   subscriptions: {},
    //   newBlockIntervalTimeoutID: null,
    //   shimMessageHandlerObject: newMessageHandlerObject,
    //   // by binding this function to `shimMessageHandlerObject`, its `this`
    //   // value will be a pointer to an object that we can mutate before
    //   // replacing when reset
    //   shimMessageHandler: function (error, jso) {
    //     this.realMessageHandler(error, jso);
    //   }.bind(newMessageHandlerObject)
    // };
    // reset public state
    // this.block = null;
    // this.excludedFromTxRelay = {};
    // this.gasPrice = 20000000000;
    // this.notifications = {};
    // this.rawTxMaxNonce = -1;
    // this.txs = {};
  };
}

module.exports = resetState;
