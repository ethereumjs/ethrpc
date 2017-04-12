"use strict";

function errorSplittingWrapper(callback) {
  return function (errorOrResult) {
    if (!errorOrResult) return callback(undefined, errorOrResult);
    if (errorOrResult instanceof Error) return callback(errorOrResult, undefined);
    if (errorOrResult.error) return callback(errorOrResult, undefined);
    return callback(undefined, errorOrResult);
  };
}

module.exports = errorSplittingWrapper;
