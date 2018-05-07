"use strict";

function stopPollingForBlocks() {
  return function (dispatch, getState) {
    clearInterval(getState().newBlockPollingInterval);
    dispatch({ type: "CLEAR_NEW_BLOCK_POLLING_INTERVAL" });
  };
}

module.exports = stopPollingForBlocks;
