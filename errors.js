function ErrorWithData(message, data) {
    Error.call(this, message);
    this.name = "ErrorWithData";
    this.data = data;
}

ErrorWithData.prototype = Object.create(Error.prototype);
ErrorWithData.prototype.constructor = ErrorWithData;

function ErrorWithCode(message, code) {
  Error.call(this, message);
  this.name = "ErrorWithCode";
  this.code = code;
}

ErrorWithCode.prototype = Object.create(Error.prototype);
ErrorWithCode.prototype.constructor = ErrorWithCode;

function ErrorWithCodeAndData(message, code, data) {
  Error.call(this, message);
  this.name = "ErrorWithCodeAndData";
  this.code = code;
  this.data = data;
}

module.exports = {
    ErrorWithCode: ErrorWithCode,
    ErrorWithData: ErrorWithData,
    ErrorWithCodeAndData: ErrorWithCodeAndData
};
