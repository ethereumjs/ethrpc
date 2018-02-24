"use strict";

function logError(err, result) {
  if (err != null) {
    console.error(err);
    if (result != null) console.log(result);
  }
}

module.exports = logError;
