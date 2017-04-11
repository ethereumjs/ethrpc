"use strict";

/**
 * Provides access to the internally managed BlockAndLogStreamer instance.
 */
function getBlockAndLogStreamer() {
  return function (dispatch, getState) {
    return getState().blockAndLogStreamer;
  };
}

module.exports = getBlockAndLogStreamer;
