ethrpc
======

[![Build Status](https://travis-ci.org/ethereumjs/ethrpc.svg)](https://travis-ci.org/ethereumjs/ethrpc)
[![Coverage Status](https://coveralls.io/repos/ethereumjs/ethrpc/badge.svg?branch=master&service=github)](https://coveralls.io/github/ethereumjs/ethrpc?branch=master)
[![npm version](https://badge.fury.io/js/ethrpc.svg)](http://badge.fury.io/js/ethrpc)

JavaScript RPC communication with the Ethereum network.

Usage
-----

ethrpc can be installed using npm:
```
npm install ethrpc
```
After installing, to use it with Node, require it and call connect:

```javascript
var rpc = require("ethrpc");
var outOfBandErrorHandler = (error) => console.log(error);
var connectionConfiguration = {
  httpAddresses: ["http://localhost:8545"], // optional, default empty array
  wsAddresses: [], // optional, default empty array
  ipcAddresses: [], // optional, default empty array
  connectionTimeout: 3000, // optional, default 3000
  errorHandler: outOfBandErrorHandler, // required, only used for errors that can't be correlated back to a request
};
var connectCompleteCallback = (connected) => if (connected) console.log("connected to Ethereum node!") else console.log("Failed to connect to Ethereum node.");
rpc.connect(connectionConfiguration, connectCompleteCallback);
```

A minified, browserified file `dist/ethrpc.min.js` is included for use in the browser.  Including this file simply attaches an `ethrpc` object to `window`:

```html
<script src="dist/ethrpc.min.js" type="text/javascript"></script>
```

### Basic RPC

The `raw` method allows you to send in commands that won't be parsed/mangled by ethrpc.  (Similar to sending RPC requests with cURL.)

```javascript
rpc.raw("net_peerCount");
"0x10"

rpc.eth("gasPrice");
"0x015f90"
```

Many commonly used functions have named wrappers.  For example, `blockNumber` fetches the current block number:


```javascript
rpc.blockNumber();
"0x35041"
```

### Contract upload and download

`publish` broadcasts (uploads) a compiled contract to the network:

```javascript
var txHash = rpc.publish("0x603980600b6000396044567c01000000000000000000000000000000000000000000000000000000006000350463643ceff9811415603757600a60405260206040f35b505b6000f3");
// txHash:
"0x6a532c807eb49d78bf0fb7962743c7f155a4b2fc1258b749df85c88b66fc3316"

// To get the contract's address, after the transaction is sealed (mined), get its receipt:
var address = rpc.getTransactionReceipt(txHash).contractAddress;
// address:
"0x86fb6d1f1bd78cc13c6354b6436b6ea0c144de2e"
```

`getCode` downloads code from a contract already on the Ethereum network:

```javascript
var contractCode = rpc.getCode("0x86fb6d1f1bd78cc13c6354b6436b6ea0c144de2e");
// contractCode:
"0x7c010000000000000000000000000000000000000000000000000000000060003504636ffa1caa81141560415760043560405260026040510260605260206060f35b50"
```

### Contract methods: call and sendTransaction

The `invoke` method executes a method in a contract already on the network.  It can broadcast transactions to the network and/or capture return values by calling the contract method(s) locally.

```javascript
// The method called here doubles its input argument.
rpc.invoke({
   to: "0x5204f18c652d1c31c6a5968cb65e011915285a50",
   method: "double",
   signature: ["int256"],
   params: ["0x5669"], // parameter value(s)
   send: false,
   returns: "int"
});
// returns:
44242
```
Transaction fields are as follows:

Required:

- to: `<contract address> (hexstring)`
- method: `<function name> (string)`
- signature: `<function signature, e.g. ["int256", "bytes", "int256[]"]> (array)`
- params: `<parameters passed to the function>`

Optional:

- send: `<true to sendTransaction, false to call (default)>`
- from: `<sender's address> (hexstring; defaults to the coinbase account)`
- returns: `<"int256" (default), "int", "number", "int256[]", "number[]", or "string">`

The `params` and `signature` fields are required if your function accepts parameters; otherwise, these fields can be excluded.  The `returns` field is used only to format the output, and does not affect the actual RPC request.

Tests
-----

Unit tests are included in `test/ethrpc.js`, and can be run using npm:
```
npm test
```

Alternatively, you can run the tests inside of a docker container.  Docker layer caching is leveraged to make it so the build is very fast after the first time (unless you change dependencies):
```
docker build -t ethrpc . && docker run --rm ethrpc
```

Internal Architecture
---------------------

Upon calling `connect`, a `Transporter` will be instantiated with the supplied addresses to connect to.  A `Transport` will be created for each of the supplied addresses plus one for MetaMask and one for Sync (which uses HTTP addresses).  Once they have all either successfully connected or failed to connect, `Transporter` will choose the first address for each transport type (HTTP, WS, IPC, Sync, MetaMask) that connected successfully and use that as the `Transport` for that transport type.  When a call to the blockchain is made, `Transporter` will choose the most appropriate transport for that message based on its requirements (SYNC, DUPLEX, etc.).  If there are no requirements of the transport then one will be chosen automatically based on a preference of `MetaMask > IPC > WS > HTTP`.  If no transports are available that meet the requirements, the request will fail.  The `Transports` each have their own internal queue of work and if they lose a connection they will queue up incoming requests until a connection can be re-established.  Once it is, the queue will be pumped until empty.
