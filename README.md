ethrpc
======

[![Build Status](https://travis-ci.org/AugurProject/ethrpc.svg)](https://travis-ci.org/AugurProject/ethrpc)
[![Coverage Status](https://coveralls.io/repos/AugurProject/ethrpc/badge.svg?branch=master&service=github)](https://coveralls.io/github/AugurProject/ethrpc?branch=master)

[![NPM](https://nodei.co/npm/ethrpc.png)](https://nodei.co/npm/ethrpc/)

Basic JSON RPC methods for Ethereum.

Usage
-----

ethrpc can be installed using npm:
```
$ npm install ethrpc
```
After installing, to use it with Node, just require it:
```javascript
> var ethrpc = require("ethrpc");
```
A minified, browserified file `dist/ethrpc.min.js` is included for use in the browser.  Including this file simply attaches the `ethrpc` object to `window`:
```html
<script src="dist/ethrpc.min.js" type="text/javascript"></script>
```

Tests
-----

Unit tests are included in `test/ethrpc.js`, and can be run using npm:
```
$ npm test
```
