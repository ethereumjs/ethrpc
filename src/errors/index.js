"use strict";

function BetterError(message) {
  var underlying = Error.call(this, message);
  this.name = underlying.name;
  this.message = underlying.message;
  Object.defineProperty(this, "stack", { get: function () { return underlying.stack; } });
}
BetterError.prototype = Object.create(Error.prototype, { constructor: { value: BetterError }});

function ErrorWithData(message, data) {
  BetterError.call(this, message);
  this.name = "ErrorWithData";
  this.data = data;
}
ErrorWithData.prototype = Object.create(BetterError.prototype, { constructor: { value: ErrorWithData } });

function ErrorWithCode(message, code) {
  BetterError.call(this, message);
  this.name = "ErrorWithCode";
  this.code = code;
}
ErrorWithCode.prototype = Object.create(BetterError.prototype, { constructor: { value: ErrorWithData } });

function ErrorWithCodeAndData(message, code, data) {
  Error.call(this, message);
  this.name = "ErrorWithCodeAndData";
  this.code = code;
  this.data = data;
}
ErrorWithCodeAndData.prototype = Object.create(BetterError.prototype, { constructor: { value: ErrorWithData } });

module.exports = {
  ErrorWithCode: ErrorWithCode,
  ErrorWithData: ErrorWithData,
  ErrorWithCodeAndData: ErrorWithCodeAndData
};
