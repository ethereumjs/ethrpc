"use strict";

var removeAllStoreListeners = require("./store-observer").removeAllStoreListeners;
var isFunction = require("./utils/is-function");

/**
 * Resets the Redux store to its initial state.
 */
function resetState() {
  return function (dispatch, getState) {
    var blockNotifier, debug, state = getState();
    blockNotifier = state.blockNotifier;
    debug = state.debug;

    // stop any pending timers
    dispatch({ type: "CLEAR_NEW_BLOCK_TIMER" });

    // reset configuration to defaults
    dispatch({ type: "RESET_CONFIGURATION" });

    // destroy the old BlockNotifier so it doesn't try to reconnect or continue polling
    if (blockNotifier && isFunction(blockNotifier.destroy)) blockNotifier.destroy();

    // redirect any not-yet-received responses to /dev/null
    dispatch({
      type: "REDIRECT_SHIM_MESSAGE_HANDLER",
      redirect: function () { return dispatch({ type: "DEV_NULL" }); }
    });

    removeAllStoreListeners();
    dispatch({ type: "REMOVE_ALL_SUBSCRIPTIONS" });

    // reset state to defaults
    dispatch({ type: "RESET_STATE" });
    dispatch({
      type: "SET_SHIM_MESSAGE_HANDLER",
      messageHandler: function (err, jso) {
        dispatch(this.realMessageHandler(err, jso));
      }.bind(getState().shimMessageHandlerObject)
    });

    // restore debugging options
    dispatch({ type: "SET_DEBUG_OPTIONS", options: debug });
  };
}

module.exports = resetState;
