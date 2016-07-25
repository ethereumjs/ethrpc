/**
 * JSON RPC methods for Ethereum
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var NODE_JS = (typeof module !== "undefined") && process && !process.browser;
var net, request, syncRequest;
if (NODE_JS) {
    net = require("net");
    request = require("request");
    syncRequest = require("sync-request");
    console.debug = console.log;
} else {
    request = require("browser-request");
}
var async = require("async");
var clone = require("clone");
var W3CWebSocket = (NODE_JS) ? require("websocket").w3cwebsocket : WebSocket;
var BigNumber = require("bignumber.js");
var keccak_256 = require("js-sha3").keccak_256;
var errors = require("augur-contracts").errors;
var abi = require("augur-abi");

BigNumber.config({MODULO_MODE: BigNumber.EUCLID});

function RPCError(err) {
    this.name = "RPCError";
    this.message = JSON.stringify(err);
}

RPCError.prototype = Error.prototype;

function isFunction(f) {
    return Object.prototype.toString.call(f) === "[object Function]";
}

function wait(delay) {
    var until = new Date().getTime() + delay;
    while (new Date().getTime() < until) {}
    return;
}

var HOSTED_NODES = [
    // "https://morden-state.ether.camp/api/v1/transaction/submit"
    "https://eth3.augur.net"
];
var HOSTED_WEBSOCKET = "wss://ws.augur.net";

var noop = function () {};

module.exports = {

    debug: {
        tx: false,
        broadcast: false
    },

    // geth IPC endpoint (Node-only)
    ipcpath: null,
    socket: null,

    // geth websocket endpoint
    wsUrl: process.env.GETH_WEBSOCKET_URL || HOSTED_WEBSOCKET,

    // initial value 0
    // if connection fails: -1
    // if connection succeeds: 1
    ipcStatus: 0,
    wsStatus: 0,

    // active websocket (if connected)
    websocket: null,

    // local ethereum node address
    localnode: "http://127.0.0.1:8545",

    // Maximum number of transaction verification attempts
    TX_POLL_MAX: 128,

    // Transaction polling interval
    TX_POLL_INTERVAL: 5000,

    // Default timeout for asynchronous POST
    POST_TIMEOUT: 30000,

    DEFAULT_GAS: "0x2fd618",

    ETHER: new BigNumber(10).toPower(18),

    Error: RPCError,

    errors: errors,

    nodes: {
        hosted: HOSTED_NODES.slice(),
        local: null
    },

    requests: 1,

    txs: {},

    rawTxs: {},

    notifications: {},

    gasPrice: 20000000000,

    unmarshal: function (string, returns, stride, init) {
        var elements, array, position;
        if (string && string.length >= 66) {
            stride = stride || 64;
            elements = Math.ceil((string.length - 2) / stride);
            array = new Array(elements);
            position = init || 2;
            for (var i = 0; i < elements; ++i) {
                array[i] = abi.prefix_hex(
                    string.slice(position, position + stride)
                );
                position += stride;
            }
            if (array.length) {
                if (parseInt(array[0]) === array.length - 1) {
                    array.splice(0, 1);
                } else if (parseInt(array[1]) === array.length - 2 ||
                    parseInt(array[1]) / 32 === array.length - 2) {
                    array.splice(0, 2);
                }
            }
            for (i = 0; i < array.length; ++i) {
                if (returns === "number[]") {
                    array[i] = abi.string(array[i]);
                } else if (returns === "unfix[]") {
                    array[i] = abi.unfix(array[i], "string");
                }
            }
            return array;
        } else {
            return string;
        }
    },

    applyReturns: function (returns, result) {
        var res;
        if (!returns) return result;
        if (result && result !== "0x") {
            if (result.error) return result;
            returns = returns.toLowerCase();
            res = clone(result);
            if (returns && returns.slice(-2) === "[]") {
                res = this.unmarshal(res, returns);
                if (returns === "hash[]") res = abi.hex(res);
            } else if (returns === "string") {
                res = abi.raw_decode_hex(res);
            } else if (returns === "number") {
                res = abi.string(res, true);
            } else if (returns === "int") {
                res = abi.number(res, true);
            } else if (returns === "bignumber") {
                res = abi.bignum(res, null, true);
            } else if (returns === "unfix") {
                res = abi.unfix(res, "string");
            } else if (returns === "null") {
                res = null;
            } else if (returns === "address" || returns === "address[]") {
                res = abi.format_address(res);
            }
        } else {
            res = result;
        }
        return res;
    },

    parse: function (origResponse, returns, callback) {
        var results, len, err;
        var response = clone(origResponse);
        if ((response && response.error) || this.debug.broadcast) {
            console.debug("[ethrpc] response:", response);
        }
        if (response && typeof response === "string") {
            try {
                response = JSON.parse(response);
            } catch (e) {
                err = e;
                if (e && e.name === "SyntaxError") {
                    err = errors.INVALID_RESPONSE;
                }
                if (isFunction(callback)) return callback(err);
                throw new this.Error(err);
            }
        }
        if (response !== undefined && typeof response === "object" && response !== null) {
            if (response.error) {
                response = {
                    error: response.error.code,
                    message: response.error.message
                };
                if (!isFunction(callback)) return response;
                return callback(response);
            } else if (response.result !== undefined) {
                if (!isFunction(callback)) return response.result;
                return callback(response.result);
            } else if (response.constructor === Array && response.length) {
                len = response.length;
                results = new Array(len);
                for (var i = 0; i < len; ++i) {
                    results[i] = response[i].result;
                    if (response.error || (response[i] && response[i].error)) {
                        if (this.debug.broadcast) {
                            if (isFunction(callback)) return callback(response.error);
                            throw new this.Error(response.error);
                        }
                    }
                }
                if (!isFunction(callback)) return results;
                return callback(results);
            }

            // no result or error field
            err = errors.NO_RESPONSE;
            err.bubble = response;
            if (isFunction(callback)) return callback(err);
            throw new this.Error(err);
        }
    },

    strip: function (tx) {
        var returns;
        if (tx.method === "eth_coinbase") return "address";
        if (tx.params !== undefined && tx.params.length && tx.params[0]) {
            if (tx.params[0].returns) {
                returns = tx.params[0].returns;
                delete tx.params[0].returns;
            }
            if (tx.params[0].invocation) {
                delete tx.params[0].invocation;
            }
        }
        return returns;
    },

    subscriptions: {},

    registerSubscriptionCallback: function (id, callback) {
        this.subscriptions[id] = callback;
    },

    ipcRequests: {},
    wsRequests: {},

    ipcConnect: function (callback) {
        var self = this;
        var received = "";
        this.socket = new net.Socket();
        this.socket.setEncoding("utf8");
        this.socket.on("data", function (data) {
            var parsed;
            try {
                parsed = JSON.parse(data);
            } catch (exc) {
                if (self.debug.broadcast) console.debug(exc);
                received += data;
                try {
                    parsed = JSON.parse(received);
                } catch (ex) {
                    if (self.debug.broadcast) console.debug(ex);
                }
            }
            if (parsed) {
                if (parsed.id !== undefined && parsed.id !== null) {
                    var req = self.ipcRequests[parsed.id];
                    delete self.ipcRequests[parsed.id];
                    self.parse(JSON.stringify(parsed), req.returns, req.callback);
                } else if (parsed.method === "eth_subscription" && parsed.params &&
                    parsed.params.subscription && parsed.params.result &&
                    self.subscriptions[parsed.params.subscription]) {
                    self.subscriptions[parsed.params.subscription](parsed.params.result);
                }
                received = "";
            }
        });
        this.socket.on("end", function () { received = ""; });
        this.socket.on("error", function (err) {
            self.ipcStatus = -1;
            self.socket.destroy();
            received = "";
            if (self.debug.broadcast) {
                console.error("[ethrpc] IPC socket error", self.ipcpath, self.ipcStatus, err);
            }
        });
        this.socket.on("close", function (err) {
            self.ipcStatus = (err) ? -1 : 0;
            received = "";
            if (self.debug.broadcast) {
                console.warn("[ethrpc] IPC socket closed", self.ipcpath, self.ipcStatus);
            }
        });
        this.socket.connect({path: this.ipcpath}, function () {
            self.ipcStatus = 1;
            callback(true);
        });
    },

    wsMessageAction: function (msg) {
        if (msg.constructor === Array) {
            for (var i = 0, n = msg.length; i < n; ++i) {
                this.wsMessageAction(msg[i]);
            }
        } else {
            if (msg.id !== undefined && msg.id !== null) {
                if (this.debug.broadcast) {
                    console.debug("[ethrpc] matched message ID", msg.id, "to", this.wsRequests);
                }
                var req = this.wsRequests[msg.id];
                delete this.wsRequests[msg.id];
                return this.parse(msg, req.returns, req.callback);
            } else if (msg.method === "eth_subscription" && msg.params &&
                msg.params.subscription && msg.params.result &&
                this.subscriptions[msg.params.subscription]) {
                return this.subscriptions[msg.params.subscription](msg.params.result);
            }
            if (this.debug.broadcast) {
                console.warn("[ethrpc] Unknown message received:", msg.data || msg);
            }
        }
    },

    wsConnect: function (callback) {
        var self = this;
        var calledCallback = false;
        if (!this.wsUrl) {
            this.wsStatus = -1;
            return callback(false);
        }
        this.websocket = new W3CWebSocket(this.wsUrl);
        this.websocket.onerror = function () {
            if (self.debug.broadcast) {
                console.error("[ethrpc] WebSocket error", self.wsUrl, self.wsStatus);
            }
            self.wsStatus = -1;
            self.wsUrl = null;
        };
        this.websocket.onclose = function () {
            if (self.wsStatus === 1) self.wsStatus = 0;
            if (self.debug.broadcast) {
                console.warn("[ethrpc] WebSocket closed", self.wsUrl, self.wsStatus);
            }
            if (!calledCallback) callback(false);
        };
        this.websocket.onmessage = function (msg) {
            if (msg && msg.data && typeof msg.data === "string") {
                return self.wsMessageAction(JSON.parse(msg.data));
            }
        };
        this.websocket.onopen = function () {
            self.wsStatus = 1;
            calledCallback = true;
            callback(true);
        };
    },

    ipcSend: function (command, returns, callback) {
        if (this.debug.broadcast) {
            console.debug("[ethrpc] IPC request to", this.ipcpath, "\n" + JSON.stringify(command));
        }
        this.ipcRequests[command.id] = {returns: returns, callback: callback};
        if (this.ipcStatus === 1) this.socket.write(JSON.stringify(command));
    },

    wsSend: function (command, returns, callback) {
        var self = this;
        if (this.debug.broadcast) {
            console.debug("[ethrpc] WebSocket request to", this.wsUrl, "\n" + JSON.stringify(command));
        }
        if (command.constructor === Array) {
            var commandList = [];
            for (var i = 0, n = command.length; i < n; ++i) {
                commandList.push({command: command[i], returns: returns[i], callback: callback[i]});
            }
            async.each(commandList, function (thisCommand, nextCommand) {
                if (!thisCommand.returns) {
                    self.wsRequests[thisCommand.command.id] = {returns: thisCommand.returns, callback: thisCommand.callback};
                } else {
                    self.wsRequests[thisCommand.command.id] = {returns: thisCommand.returns, callback: function (res) {
                        thisCommand.callback(self.applyReturns(thisCommand.returns, res));
                    }};
                }
                nextCommand();
            }, function (err) {
                if (err) return console.error("wsSend failed:", err);
                self.wsRequests[command.id] = {returns: returns, callback: callback};
                if (self.websocket.readyState === self.websocket.OPEN) {
                    self.websocket.send(JSON.stringify(command));
                }
            });
        } else {
            this.wsRequests[command.id] = {returns: returns, callback: callback};
            if (this.websocket.readyState === this.websocket.OPEN) {
                this.websocket.send(JSON.stringify(command));
            }
        }
    },

    postSync: function (rpcUrl, command, returns) {
        var timeout, req = null;
        if (command.timeout) {
            timeout = command.timeout;
            delete command.timeout;
        } else {
            timeout = this.POST_TIMEOUT;
        }
        if (this.debug.broadcast) {
            console.warn("[ethrpc] Synchronous HTTP request to", rpcUrl + "\n" + JSON.stringify(command));
        }
        if (NODE_JS) {
            req = syncRequest("POST", rpcUrl, {json: command, timeout: timeout});
            var response = req.getBody().toString();
            return this.parse(response, returns);
        }
        if (window.XMLHttpRequest) {
            req = new window.XMLHttpRequest();
        } else {
            req = new window.ActiveXObject("Microsoft.XMLHTTP");
        }
        req.open("POST", rpcUrl, false);
        req.setRequestHeader("Content-type", "application/json");
        req.send(JSON.stringify(command));
        return this.parse(req.responseText, returns);
    },

    post: function (rpcUrl, command, returns, callback) {
        var timeout, self = this;
        if (command.timeout) {
            timeout = command.timeout;
            delete command.timeout;
        } else {
            timeout = this.POST_TIMEOUT;
        }
        if (this.debug.broadcast) {
            console.debug("[ethrpc] Asynchronous HTTP request to", rpcUrl + "\n" + JSON.stringify(command));
        }
        request({
            url: rpcUrl,
            method: 'POST',
            json: command,
            timeout: timeout
        }, function (err, response, body) {
            var e;
            if (err) {
                self.primaryNode = null;
                if (self.nodes.local) {
                    e = errors.LOCAL_NODE_FAILURE;
                    e.bubble = err;
                    e.command = command;
                    return callback(e);
                }
                console.warn("[ethrpc] asynchronous RPC timed out", rpcUrl, command);
                e = errors.RPC_TIMEOUT;
                e.bubble = err;
                e.command = command;
                callback(e);
            } else if (response.statusCode === 200) {
                self.parse(body, returns, callback);
            }
        });
    },

    selectNodes: function () {
        if (this.nodes.local) return [this.nodes.local];
        return this.nodes.hosted.slice();
    },

    // Post JSON-RPC command to all Ethereum nodes
    broadcast: function (command, callback) {
        var nodes, numCommands, returns, result, completed, self = this;
        if (!command || (command.constructor === Object && !command.method) ||
            (command.constructor === Array && !command.length)) {
            if (!callback) return null;
            return callback(null);
        }

        // make sure the ethereum node list isn't empty
        if (!this.nodes.local && !this.nodes.hosted.length && !this.ipcpath && !this.wsUrl) {
            if (isFunction(callback)) return callback(errors.ETHEREUM_NOT_FOUND);
            throw new this.Error(errors.ETHEREUM_NOT_FOUND);
        }

        // parse batched commands and strip "returns" and "invocation" fields
        if (command.constructor === Array) {
            numCommands = command.length;
            returns = new Array(numCommands);
            for (var i = 0; i < numCommands; ++i) {
                returns[i] = this.strip(command[i]);
            }

        // parse commands and strip "returns" and "invocation" fields
        } else {
            returns = this.strip(command);
        }

        // if we're on Node, use IPC if available and ipcpath is specified
        if (NODE_JS && this.ipcpath && command.method) {
            var loopback = this.nodes.local && (
                (this.nodes.local.indexOf("127.0.0.1") > -1 ||
                this.nodes.local.indexOf("localhost") > -1));
            if (!isFunction(callback) && !loopback) {
                throw new this.Error(errors.LOOPBACK_NOT_FOUND);
            }
            if (isFunction(callback) && command.constructor !== Array) {
                if (!this.ipcpath) this.ipcStatus = -1;
                switch (this.ipcStatus) {

                // [0] IPC socket closed / not connected: try to connect
                case 0:
                    return this.ipcConnect(function (connected) {
                        if (!connected) return self.broadcast(command, callback);
                        self.ipcSend(command, returns, callback);
                    });

                // [1] IPC socket connected
                case 1:
                    return this.ipcSend(command, returns, callback);
                }
            }
        }

        // select local / hosted node(s) to receive RPC
        nodes = this.selectNodes();

        // asynchronous request if callback exists
        if (callback) {

            // use websocket if available
            switch (this.wsStatus) {

            // [0] websocket closed / not connected: try to connect
            case 0:
                this.wsConnect(function (connected) {
                    if (!connected) return self.broadcast(command, callback);
                    self.wsSend(command, returns, callback);
                });
                break;

            // [1] websocket connected
            case 1:
                this.wsSend(command, returns, callback);
                break;

            // [-1] websocket errored or unavailable: fallback to HTTP RPC
            default:
                async.eachSeries(nodes, function (node, nextNode) {
                    if (!completed) {
                        self.post(node, command, returns, function (res) {
                            if (node === nodes[nodes.length - 1] ||
                                (res !== undefined && res !== null &&
                                !res.error && res !== "0x")) {
                                completed = true;
                                return nextNode({output: res});
                            }
                            nextNode();
                        });
                    }
                }, function (res) {
                    if (!res && res.output === undefined) return callback();
                    callback(res.output);
                });
            }

        // use synchronous http if no callback provided
        } else {
            for (var j = 0, len = nodes.length; j < len; ++j) {
                try {
                    result = this.postSync(nodes[j], command, returns);
                } catch (e) {
                    if (this.nodes.local) {
                        var err = errors.LOCAL_NODE_FAILURE;
                        err.bubble = e;
                        err.command = command;
                        throw new this.Error(err);
                    }
                }
                if (result !== undefined) return result;
            }
            throw new this.Error(errors.NO_RESPONSE);
        }
    },

    marshal: function (command, params, prefix) {
        var payload, action;
        if (prefix === "null") {
            action = command.toString();
        } else {
            action = (prefix || "eth_") + command.toString();
        }

        // direct-to-geth
        payload = {
            id: this.requests++,
            jsonrpc: "2.0",
            method: action
        };
        if (params !== undefined && params !== null) {
            if (params.constructor === Object) {
                if (this.debug.broadcast && params.debug) {
                    payload.debug = clone(params.debug);
                    delete params.debug;
                }
                if (params.timeout) {
                    payload.timeout = params.timeout;
                    delete params.timeout;
                }
                if (JSON.stringify(params) === "{}") {
                    params = [];
                }
            }
            if (params.constructor === Array) {
                for (var i = 0, len = params.length; i < len; ++i) {
                    if (params[i] !== null && params[i] !== undefined &&
                        params[i].constructor === Number) {
                        params[i] = abi.prefix_hex(params[i].toString(16));
                    }
                }
                payload.params = params;
            } else {
                payload.params = [params];
            }
        } else {
            payload.params = [];
        }
        return payload;
    },

    setLocalNode: function (urlstr) {
        this.nodes.local = urlstr || this.localnode;
    },

    useHostedNode: function (host) {
        this.nodes.local = null;
        if (host) {
            if (host.constructor === Object) {
                if (host.http) this.nodes.hosted = [host.http];
                if (host.ws) this.wsUrl = host.ws;
            } else {
                this.nodes.hosted = [host];
            }
        }
    },

    // delete cached network, notification, and transaction data
    clear: function () {
        this.txs = {};
        for (var n in this.notifications) {
            if (!this.notifications.hasOwnProperty(n)) continue;
            if (this.notifications[n]) {
                clearTimeout(this.notifications[n]);
            }
        }
        this.notifications = {};
    },

    // reset to default Ethereum nodes
    reset: function (deleteData) {
        this.nodes.hosted = HOSTED_NODES.slice();
        this.wsUrl = process.env.GETH_WEBSOCKET_URL || HOSTED_WEBSOCKET;
        if (deleteData) this.clear();
    },

    /******************************
     * Ethereum JSON-RPC bindings *
     ******************************/

    raw: function (command, params, f) {
        return this.broadcast(this.marshal(command, params, "null"), f);
    },

    eth: function (command, params, f) {
        return this.broadcast(this.marshal(command, params), f);
    },

    net: function (command, params, f) {
        return this.broadcast(this.marshal(command, params, "net_"), f);
    },

    web3: function (command, params, f) {
        return this.broadcast(this.marshal(command, params, "web3_"), f);
    },

    shh: function (command, params, f) {
        return this.broadcast(this.marshal(command, params, "shh_"), f);
    },

    miner: function (command, params, f) {
        return this.broadcast(this.marshal(command, params, "miner_"), f);
    },

    admin: function (command, params, f) {
        return this.broadcast(this.marshal(command, params, "admin_"), f);
    },

    personal: function (command, params, f) {
        return this.broadcast(this.marshal(command, params, "personal_"), f);
    },

    txpool: function (command, params, f) {
        return this.broadcast(this.marshal(command, params, "txpool_"), f);
    },

    sha3: function (data, isHex) {
        if (isHex) data = abi.decode_hex(data);
        return abi.prefix_hex(keccak_256(data));
    },

    getGasPrice: function (f) {
        return this.broadcast(this.marshal("gasPrice"), f);
    },

    blockNumber: function (f) {
        if (isFunction(f)) {
            this.broadcast(this.marshal("blockNumber"), f);
        } else {
            return parseInt(this.broadcast(this.marshal("blockNumber")));
        }
    },

    coinbase: function (f) {
        return this.broadcast(this.marshal("coinbase"), f);
    },

    balance: function (address, block, f) {
        if (!f && isFunction(block)) {
            f = block;
            block = null;
        }
        block = block || "latest";
        return this.broadcast(this.marshal("getBalance", [address, block]), f);
    },
    getBalance: function (address, block, f) {
        if (!f && isFunction(block)) {
            f = block;
            block = null;
        }
        block = block || "latest";
        return this.broadcast(this.marshal("getBalance", [address, block]), f);
    },

    txCount: function (address, f) {
        return this.broadcast(this.marshal("getTransactionCount", [address, "latest"]), f);
    },
    getTransactionCount: function (address, f) {
        return this.broadcast(this.marshal("getTransactionCount", [address, "latest"]), f);
    },
    pendingTxCount: function (address, f) {
        return this.broadcast(
            this.marshal("getTransactionCount", [address, "pending"]), f
        );
    },

    sendEther: function (to, value, from, onSent, onSuccess, onFailed) {
        if (to && to.constructor === Object && to.value) {
            value = to.value;
            if (to.from) from = to.from;
            if (to.onSent) onSent = to.onSent;
            if (to.onSuccess) onSuccess = to.onSuccess;
            if (to.onFailed) onFailed = to.onFailed;
            to = to.to;
        }
        return this.transact({
            from: from,
            to: to,
            value: abi.fix(value, "string"),
            returns: "null"
        }, onSent, onSuccess, onFailed);
    },

    sign: function (address, data, f) {
        return this.broadcast(this.marshal("sign", [address, data]), f);
    },

    getTx: function (hash, f) {
        return this.broadcast(this.marshal("getTransactionByHash", hash), f);
    },
    getTransaction: function (hash, f) {
        return this.broadcast(this.marshal("getTransactionByHash", hash), f);
    },

    peerCount: function (f) {
        if (isFunction(f)) {
            this.broadcast(this.marshal("peerCount", [], "net_"), f);
        } else {
            return parseInt(this.broadcast(this.marshal("peerCount", [], "net_")));
        }
    },

    accounts: function (f) {
        return this.broadcast(this.marshal("accounts"), f);
    },

    mining: function (f) {
        return this.broadcast(this.marshal("mining"), f);
    },

    hashrate: function (f) {
        if (isFunction(f)) {
            this.broadcast(this.marshal("hashrate"), f);
        } else {
            return parseInt(this.broadcast(this.marshal("hashrate")));
        }
    },

    getBlockByHash: function (hash, full, f) {
        full = (full !== undefined) ? full : true;
        return this.broadcast(this.marshal("getBlockByHash", [hash, full]), f);
    },

    getBlock: function (number, full, f) {
        full = (full !== undefined) ? full : true;
        return this.broadcast(this.marshal("getBlockByNumber", [number, full]), f);
    },
    getBlockByNumber: function (number, full, f) {
        full = (full !== undefined) ? full : true;
        return this.broadcast(this.marshal("getBlockByNumber", [number, full]), f);
    },

    version: function (f) {
        return this.broadcast(this.marshal("version", [], "net_"), f);
    },
    netVersion: function (f) {
        return this.broadcast(this.marshal("version", [], "net_"), f);
    },

    // estimate a transaction's gas cost
    estimateGas: function (tx, f) {
        return this.broadcast(this.marshal("estimateGas", tx), f);
    },

    // execute functions on contracts on the blockchain
    call: function (tx, f) {
        tx.gas = tx.gas || this.DEFAULT_GAS;
        return this.broadcast(this.marshal("call", [tx, "latest"]), f);
    },

    sendTx: function (tx, f) {
        tx.gas = tx.gas || this.DEFAULT_GAS;
        return this.broadcast(this.marshal("sendTransaction", tx), f);
    },
    sendTransaction: function (tx, f) {
        tx.gas = tx.gas || this.DEFAULT_GAS;
        return this.broadcast(this.marshal("sendTransaction", tx), f);
    },

    // sendRawTx(RLP(tx.signed(privateKey))) -> txhash
    sendRawTx: function (rawTx, f) {
        return this.broadcast(this.marshal("sendRawTransaction", abi.prefix_hex(rawTx)), f);
    },
    sendRawTransaction: function (rawTx, f) {
        return this.broadcast(this.marshal("sendRawTransaction", abi.prefix_hex(rawTx)), f);
    },

    receipt: function (txhash, f) {
        return this.broadcast(this.marshal("getTransactionReceipt", txhash), f);
    },
    getTransactionReceipt: function (txhash, f) {
        return this.broadcast(this.marshal("getTransactionReceipt", txhash), f);
    },

    clientVersion: function (f) {
        return this.broadcast(this.marshal("clientVersion", [], "web3_"), f);
    },

    compileSerpent: function (code, f) {
        return this.broadcast(this.marshal("compileSerpent", code), f);
    },

    compileSolidity: function (code, f) {
        return this.broadcast(this.marshal("compileSolidity", code), f);
    },

    compileLLL: function (code, f) {
        return this.broadcast(this.marshal("compileLLL", code), f);
    },

    subscribe: function (label, options, f) {
        return this.broadcast(this.marshal("subscribe", [label, options]), f);
    },

    subscribeLogs: function (options, f) {
        return this.broadcast(this.marshal("subscribe", ["logs", options]), f);
    },

    subscribeNewBlocks: function (options, f) {
        if (!f && isFunction(options)) {
            f = options;
            options = null;
        }
        return this.broadcast(this.marshal("subscribe", ["newBlocks", options || {
            includeTransactions: false,
            transactionDetails: false
        }]), f);
    },    

    unsubscribe: function (label, f) {
        return this.broadcast(this.marshal("unsubscribe", label), f);
    },

    newFilter: function (params, f) {
        return this.broadcast(this.marshal("newFilter", params), f);
    },

    newBlockFilter: function (f) {
        return this.broadcast(this.marshal("newBlockFilter"), f);
    },

    newPendingTransactionFilter: function (f) {
        return this.broadcast(this.marshal("newPendingTransactionFilter"), f);
    },

    getFilterChanges: function (filter, f) {
        return this.broadcast(this.marshal("getFilterChanges", filter), f);
    },

    getFilterLogs: function (filter, f) {
        return this.broadcast(this.marshal("getFilterLogs", filter), f);
    },

    getLogs: function (filter, f) {
        return this.broadcast(this.marshal("getLogs", filter), f);
    },

    uninstallFilter: function (filter, f) {
        return this.broadcast(this.marshal("uninstallFilter", filter), f);
    },

    // publish a new contract to the blockchain (from the coinbase account)
    publish: function (compiled, f) {
        return this.sendTx({from: this.coinbase(), data: compiled}, f);
    },

    // Read the code in a contract on the blockchain
    read: function (address, block, f) {
        return this.broadcast(this.marshal("getCode", [address, block || "latest"]), f);
    },
    getCode: function (address, block, f) {
        return this.broadcast(this.marshal("getCode", [address, block || "latest"]), f);
    },

    // Fast-forward a specified number of blocks
    fastforward: function (blocks, mine, callback) {
        var startBlock, endBlock, self = this;
        function fastforward() {
            self.blockNumber(function (blockNumber) {
                blockNumber = parseInt(blockNumber);
                if (startBlock === undefined) {
                    startBlock = blockNumber;
                    endBlock = blockNumber + parseInt(blocks);
                }
                if (blockNumber >= endBlock) {
                    if (!mine) return callback(endBlock);
                    self.miner("stop", [], function () {
                        callback(endBlock);
                    });
                } else {
                    setTimeout(fastforward, 3000);
                }
            });
        }
        if (!callback && isFunction(mine)) {
            callback = mine;
            mine = null;
        }
        if (!mine) return fastforward();
        this.miner("start", [], fastforward);
    },

    // Ethereum node status checks

    listening: function (f) {
        var response, self = this;
        try {
            if (!this.nodes.hosted.length && !this.nodes.local && !this.ipcpath) {
                throw new this.Error(errors.ETHEREUM_NOT_FOUND);
            }
            if (isFunction(f)) {
                var timeout = setTimeout(function () {
                    if (!response) f(false);
                }, 2500);
                setTimeout(function () {
                    self.net("listening", [], function (res) {
                        clearTimeout(timeout);
                        f(!!res);
                    });
                }, 0);
            } else {
                return !!this.net("listening");
            }
        } catch (e) {
            if (isFunction(f)) return f(false);
            return false;
        }
    },

    unlocked: function (account, f) {
        if (!this.nodes.hosted.length && !this.nodes.local && !this.ipcpath) {
            throw new this.Error(errors.ETHEREUM_NOT_FOUND);
        }
        try {
            if (isFunction(f)) {
                this.sign(account, "0x00000000000000000000000000000000000000000000000000000000000f69b5", function (res) {
                    if (res) {
                        if (res.error) return f(false);
                        return f(true);
                    }
                    f(false);
                });
            } else {
                var res = this.sign(account, "0x00000000000000000000000000000000000000000000000000000000000f69b5");
                if (res) {
                    if (res.error) {
                        return false;
                    }
                    return true;
                }
                return false;
            }
        } catch (e) {
            if (isFunction(f)) return f(false);
            return false;
        }
    },

    /**
     * Invoke a function from a contract on the blockchain.
     *
     * Input tx format:
     * {
     *    from: <sender's address> (hexstring; optional, coinbase default)
     *    to: <contract address> (hexstring)
     *    method: <function name> (string)
     *    signature: <function signature, e.g. "iia"> (string)
     *    params: <parameters passed to the function> (optional)
     *    returns: <"number[]", "int", "BigNumber", or "string" (default)>
     *    send: <true to sendTransaction, false to call (default)>
     * }
     */
    invoke: function (payload, f) {
        var tx, packaged, invocation;
        if (!payload || payload.constructor !== Object) {
            if (!isFunction(f)) return errors.TRANSACTION_FAILED;
            return f(errors.TRANSACTION_FAILED);
        }
        if (payload.send && payload.invocation && isFunction(payload.invocation.invoke)) {
            return payload.invocation.invoke.call(payload.invocation.context, payload, f);
        }
        tx = clone(payload);
        if (tx.params === undefined || tx.params === null) {
            tx.params = [];
        } else if (tx.params.constructor !== Array) {
            tx.params = [tx.params];
        }
        for (var j = 0, numParams = tx.params.length; j < numParams; ++j) {
            if (tx.params[j] !== undefined && tx.params[j] !== null) {
                if (tx.params[j].constructor === Number) {
                    tx.params[j] = abi.prefix_hex(tx.params[j].toString(16));
                }
                if (tx.signature[j] === "int256") {
                    tx.params[j] = abi.unfork(tx.params[j], true);
                } else if (tx.signature[j] === "int256[]" &&
                    tx.params[j].constructor === Array && tx.params[j].length) {
                    for (var k = 0, arrayLen = tx.params[j].length; k < arrayLen; ++k) {
                        tx.params[j][k] = abi.unfork(tx.params[j][k], true);
                    }
                }
            }
        }
        if (tx.to) tx.to = abi.format_address(tx.to);
        if (tx.from) tx.from = abi.format_address(tx.from);
        packaged = {
            from: tx.from,
            to: tx.to,
            data: abi.encode(tx),
            gas: tx.gas || this.DEFAULT_GAS,
            gasPrice: tx.gasPrice
        };
        if (tx.timeout) packaged.timeout = tx.timeout;
        if (tx.value) packaged.value = tx.value;
        if (tx.returns) packaged.returns = tx.returns;
        if (this.debug.broadcast) {
            packaged.debug = clone(tx);
            packaged.debug.batch = false;
        }
        invocation = (tx.send) ? this.sendTx : this.call;
        return invocation.call(this, packaged, f);
    },

    /**
     * Batched RPC commands
     */
    batch: function (txlist, f) {
        var self = this;
        var numCommands, rpclist, callbacks, tx, dataAbi, packaged, invocation, returns;
        if (txlist.constructor !== Array) {
            if (this.debug.broadcast) {
                console.warn("expected array for batch RPC, invoking instead");
            }
            return this.invoke(txlist, f);
        }
        numCommands = txlist.length;
        rpclist = new Array(numCommands);
        callbacks = new Array(numCommands);
        returns = [];
        for (var i = 0; i < numCommands; ++i) {
            tx = clone(txlist[i]);
            if (tx.params === undefined || tx.params === null) {
                tx.params = [];
            } else if (tx.params.constructor !== Array) {
                tx.params = [tx.params];
            }
            for (var j = 0; j < tx.params.length; ++j) {
                if (tx.params[j].constructor === Number) {
                    tx.params[j] = abi.prefix_hex(tx.params[j].toString(16));
                }
                if (tx.signature[j] === "int256") {
                    tx.params[j] = abi.unfork(tx.params[j], true);
                } else if (tx.signature[j] === "int256[]" &&
                    tx.params[j].constructor === Array && tx.params[j].length) {
                    for (var k = 0, arrayLen = tx.params[j].length; k < arrayLen; ++k) {
                        tx.params[j][k] = abi.unfork(tx.params[j][k], true);
                    }
                }
            }
            if (tx.from) tx.from = abi.format_address(tx.from);
            if (tx.to) tx.to = abi.format_address(tx.to);
            dataAbi = abi.encode(tx);
            if (dataAbi) {
                if (isFunction(tx.callback)) {
                    callbacks[i] = tx.callback;
                    delete tx.callback;
                }
                packaged = {
                    from: tx.from,
                    to: tx.to,
                    data: dataAbi,
                    gas: tx.gas || this.DEFAULT_GAS,
                    gasPrice: tx.gasPrice
                };
                if (tx.timeout) packaged.timeout = tx.timeout;
                if (tx.value) packaged.value = tx.value;
                if (tx.returns) packaged.returns = tx.returns;
                returns.push(tx.returns);
                if (this.debug.broadcast) {
                    packaged.debug = clone(tx);
                    packaged.debug.batch = true;
                }
                invocation = (tx.send) ? "sendTransaction" : "call";
                rpclist[i] = this.marshal(invocation, [packaged, "latest"]);
            } else {
                console.error("unable to package commands for batch RPC");
                return rpclist;
            }
        }
        if (this.wsUrl) {
            return this.broadcast(rpclist, (f === true) ? callbacks : f);
        }
        if (!f) {
            var res = this.broadcast(rpclist);
            var result = new Array(numCommands);
            for (i = 0; i < numCommands; ++i) {
                if (returns[i]) {
                    result[i] = self.applyReturns(returns[i], res[i]);
                } else {
                    result[i] = res[i];
                }
            }
            return result;
        }

        // callback on whole array
        if (isFunction(f)) return this.broadcast(rpclist, function (res) {
            var result = new Array(numCommands);
            for (var i = 0; i < numCommands; ++i) {
                if (returns[i]) {
                    result[i] = self.applyReturns(returns[i], res[i]);
                } else {
                    result[i] = res[i];
                }
            }
            f(result);
        });

        // callback on each element
        this.broadcast(rpclist, function (res) {
            if (!res) return console.error(errors.TRANSACTION_FAILED);
            if (res.constructor === Array && res.length) {
                for (var j = 0; j < numCommands; ++j) {
                    if (returns[j]) {
                        res[j] = self.applyReturns(returns[j], res[j]);
                    }
                    if (res[j] && callbacks[j]) {
                        callbacks[j](res[j]);
                    }
                }
            } else {
                if (callbacks.length && isFunction(callbacks[0])) {
                    callbacks[0](res);
                }
            }
        });
    },

    errorCodes: function (method, returns, response) {
        if (response) {
            if (response.constructor === Array) {
                for (var i = 0, len = response.length; i < len; ++i) {
                    response[i] = this.errorCodes(method, returns, response[i]);
                }
            } else if (response.name && response.message && response.stack) {
                response.error = response.name;
            } else if (!response.error) {
                if (returns && returns.indexOf("[]") > -1) {
                    if (response.length >= 194) {
                        response = "0x" + response.slice(130, 194);
                    }
                }
                if (errors[response]) {
                    response = {
                        error: response,
                        message: errors[response]
                    };
                } else {
                    if (returns !== "null" && returns !== "string" ||
                        (response && response.constructor === String &&
                        response.slice(0,2) === "0x")) {
                        var responseNumber = abi.bignum(response, "string", true);
                        if (responseNumber) {
                            if (errors[method] && errors[method][responseNumber]) {
                                response = {
                                    error: responseNumber,
                                    message: errors[method][responseNumber]
                                };
                            }
                        }
                    }
                }
            }
        }
        return response;
    },

    // callback/wrapper composition: callback(wrapper(result, aux))
    fire: function (payload, callback, wrapper, aux) {
        var self = this;
        var tx = clone(payload);
        if (!isFunction(callback)) {
            var res = this.invoke(tx);
            if (res === undefined || res === null) {
                throw new this.Error(errors.NO_RESPONSE);
            }
            var err = this.errorCodes(tx.method, tx.returns, res);
            if (err && err.error) throw new this.Error(err);
            var converted = this.applyReturns(tx.returns, res);
            if (isFunction(wrapper)) return wrapper(converted, aux);
            return converted;
        }
        this.invoke(tx, function (res) {
            if (self.debug.tx) console.debug("invoked (fire):", res);
            if (res === undefined || res === null) {
                return callback(errors.NO_RESPONSE);
            }
            var err = self.errorCodes(tx.method, tx.returns, res);
            if (err && err.error) return callback(err);
            var converted = self.applyReturns(tx.returns, res);
            if (isFunction(wrapper)) converted = wrapper(converted, aux);
            return callback(converted);
        });
    },

    /***************************************
     * Send-call-confirm callback sequence *
     ***************************************/

    checkBlockHash: function (tx, callback) {
        if (!this.txs[tx.hash]) this.txs[tx.hash] = {};
        if (this.txs[tx.hash].count === undefined) this.txs[tx.hash].count = 0;
        ++this.txs[tx.hash].count;
        if (this.debug.tx) console.debug("checkBlockHash:", tx.blockHash);
        if (tx && tx.blockHash && parseInt(tx.blockHash, 16) !== 0) {
            tx.txHash = tx.hash;
            this.txs[tx.hash].status = "confirmed";
            clearTimeout(this.notifications[tx.hash]);
            delete this.notifications[tx.hash];
            if (!isFunction(callback)) return tx;
            return callback(null, tx);
        }
        if (this.txs[tx.hash].count >= this.TX_POLL_MAX) {
            this.txs[tx.hash].status = "unconfirmed";
            if (!isFunction(callback)) {
                throw new Error(errors.TRANSACTION_NOT_CONFIRMED);
            }
            return callback(errors.TRANSACTION_NOT_CONFIRMED);
        }
        if (!isFunction(callback)) {
            wait(this.TX_POLL_INTERVAL);
            if (this.txs[tx.hash].status === "pending") return null;
        } else {
            var self = this;
            this.notifications[tx.hash] = setTimeout(function () {
                if (self.txs[tx.hash].status === "pending") callback(null, null);
            }, this.TX_POLL_INTERVAL);
        }
    },

    getLoggedReturnValue: function (txHash, callback) {
        var self = this;
        if (!isFunction(callback)) {
            var receipt = this.getTransactionReceipt(txHash);
            if (!receipt || !receipt.logs || !receipt.logs.length) {
                throw new this.Error(errors.NULL_CALL_RETURN);
            }
            var log = receipt.logs[receipt.logs.length - 1];
            if (!log || log.data === null || log.data === undefined) {
                throw new this.Error(errors.NULL_CALL_RETURN);
            }
            return log.data;
        }
        this.getTransactionReceipt(txHash, function (receipt) {
            if (self.debug.tx) console.debug("got receipt:", receipt);
            if (!receipt || !receipt.logs || !receipt.logs.length) {
                return callback(errors.NULL_CALL_RETURN);
            }
            var log = receipt.logs[receipt.logs.length - 1];
            if (!log || log.data === null || log.data === undefined) {
                return callback(errors.NULL_CALL_RETURN);
            }
            callback(null, log.data);
        });
    },

    txNotify: function (txHash, callback) {
        var self = this;
        if (!isFunction(callback)) {
            var tx = this.getTransaction(txHash);
            if (tx) return tx;

            this.txs[txHash].status = "failed";
            if (this.debug.tx) console.debug("Raw transactions:", this.rawTxs);

            // resubmit if this is a raw transaction and has a duplicate nonce
            if (!this.rawTxs[txHash] || !this.rawTxs[txHash].tx) {
                throw new this.Error(errors.TRANSACTION_NOT_FOUND);
            }
            var duplicateNonce;
            for (var hash in this.rawTxs) {
                if (!this.rawTxs.hasOwnProperty(hash)) continue;
                if (this.rawTxs[hash].tx.nonce === this.rawTxs[txHash].tx.nonce &&
                    JSON.stringify(this.rawTxs[hash].tx) !== JSON.stringify(this.rawTxs[txHash].tx)) {
                    duplicateNonce = true;
                    break;
                }
            }
            if (!duplicateNonce) throw new this.Error(errors.TRANSACTION_NOT_FOUND);
            this.txs[txHash].status = "resubmitted";
            return null;
        }
        this.getTransaction(txHash, function (tx) {
            if (tx) return callback(null, tx);

            self.txs[txHash].status = "failed";
            if (self.debug.tx) console.debug("Raw transactions:", self.rawTxs);

            // resubmit if this is a raw transaction and has a duplicate nonce
            if (!self.rawTxs[txHash] || !self.rawTxs[txHash].tx) {
                return callback(errors.TRANSACTION_NOT_FOUND);
            }
            var duplicateNonce;
            for (var hash in self.rawTxs) {
                if (!self.rawTxs.hasOwnProperty(hash)) continue;
                if (self.rawTxs[hash].tx.nonce === self.rawTxs[txHash].tx.nonce &&
                    JSON.stringify(self.rawTxs[hash].tx) !== JSON.stringify(self.rawTxs[txHash].tx)) {
                    duplicateNonce = true;
                    break;
                }
            }
            if (!duplicateNonce) return callback(errors.TRANSACTION_NOT_FOUND);
            self.txs[txHash].status = "resubmitted";
            return callback(null, null);
        });
    },

    verifyTxSubmitted: function (payload, txHash, callback) {
        var self = this;
        if (!isFunction(callback)) {
            if (!payload || txHash === null || txHash === undefined) {
                throw new this.Error(errors.TRANSACTION_FAILED);
            }
            if (this.txs[txHash]) throw new this.Error(errors.DUPLICATE_TRANSACTION);
            var tx = this.getTransaction(txHash);
            if (!tx) throw new this.Error(errors.TRANSACTION_FAILED);
            this.txs[txHash] = {
                hash: txHash,
                payload: payload,
                count: 0,
                status: "pending"
            };
            return;
        }
        if (!payload || txHash === null || txHash === undefined) {
            return callback(errors.TRANSACTION_FAILED);
        }
        if (this.txs[txHash]) return callback(errors.DUPLICATE_TRANSACTION);
        this.getTransaction(txHash, function (tx) {
            if (!tx) return callback(errors.TRANSACTION_FAILED);
            self.txs[txHash] = {
                hash: txHash,
                payload: payload,
                count: 0,
                status: "pending"
            };
            callback(null);
        });
    },

    // poll the network until the transaction is included in a block
    // (i.e., has a non-null blockHash field)
    pollForTxConfirmation: function (txHash, callback) {
        var self = this;
        if (!isFunction(callback)) {
            var tx = this.txNotify(txHash);
            if (tx === null) return null;
            var minedTx = this.checkBlockHash(tx);
            if (minedTx !== null) return minedTx;
            return this.pollForTxConfirmation(txHash);
        }
        this.txNotify(txHash, function (err, tx) {
            if (err) return callback(err);
            if (tx === null) return callback(null, null);
            self.checkBlockHash(tx, function (err, minedTx) {
                if (err) return callback(err);
                if (minedTx !== null) return callback(null, minedTx);
                self.pollForTxConfirmation(txHash, callback);
            });
        });
    },

    /**
     * asynchronous / non-blocking transact:
     *  - call onSent when the transaction is broadcast to the network
     *  - call onSuccess when the transaction is successfully mined
     *  - call onFailed if the transaction fails
     */
    transactAsync: function (payload, callReturn, onSent, onSuccess, onFailed) {
        var self = this;
        payload.send = true;
        var returns = payload.returns;
        delete payload.returns;
        this.invoke(payload, function (txHash) {
            if (self.debug.tx) console.debug("txHash:", txHash);
            if (!txHash) return onFailed(errors.NULL_RESPONSE);
            if (txHash.error) return onFailed(txHash);
            payload.returns = returns;
            txHash = abi.format_int256(txHash);

            // send the transaction hash and return value back
            // to the client, using the onSent callback
            onSent({txHash: txHash, callReturn: callReturn});

            self.verifyTxSubmitted(payload, txHash, function (err) {
                if (err) return onFailed(err);
                self.pollForTxConfirmation(txHash, function (err, tx) {
                    if (err) return onFailed(err);
                    if (tx === null) {
                        return self.transact(payload, onSent, onSuccess, onFailed);
                    }
                    if (!payload.mutable) {
                        tx.callReturn = callReturn;
                        return onSuccess(tx);
                    }

                    // if mutable return value, then lookup logged return
                    // value in transaction receipt (after confirmation)
                    self.getLoggedReturnValue(txHash, function (err, loggedReturnValue) {
                        if (self.debug.tx) console.debug("loggedReturnValue:", err, loggedReturnValue);
                        if (err) {
                            payload.send = false;
                            self.fire(payload, function (callReturn) {
                                console.debug("getLoggedReturnValue failed, fire returns:", callReturn);
                                return onFailed(err);
                            });
                        }
                        var e = self.errorCodes(payload.method, payload.returns, loggedReturnValue);
                        if (e && e.error) return onFailed(e);
                        tx.callReturn = self.applyReturns(payload.returns, loggedReturnValue);
                        onSuccess(tx);
                    });
                });
            });
        });
    },

    /**
     * synchronous transact: block until the transaction is confirmed or fails
     * (don't use this in the browser or you will be a sad panda)
     */
    transactSync: function (payload) {
        var callReturn;
        if (payload.mutable || payload.returns === "null") {
            callReturn = null;
        } else {
            callReturn = this.fire(payload);
            if (this.debug.tx) console.debug("callReturn:", callReturn);
            if (callReturn === undefined || callReturn === null) {
                throw new this.Error(errors.NULL_CALL_RETURN);
            } else if (callReturn.error === "0x") {
                callReturn = null;
            } else if (callReturn.error) {
                throw new this.Error(callReturn);
            }
        }
        payload.send = true;
        var returns = payload.returns;
        delete payload.returns;
        var txHash = this.invoke(payload);
        if (this.debug.tx) console.debug("txHash:", txHash);
        if (!txHash) throw new this.Error(errors.NULL_RESPONSE);
        if (txHash.error) throw new this.Error(txHash);
        payload.returns = returns;
        txHash = abi.format_int256(txHash);
        this.verifyTxSubmitted(payload, txHash);
        var tx = this.pollForTxConfirmation(txHash);
        if (tx === null) return this.transact(payload);
        if (!payload.mutable) {
            tx.callReturn = callReturn;
            return tx;
        }

        // if mutable return value, then lookup logged return
        // value in transaction receipt (after confirmation)
        var loggedReturnValue = this.getLoggedReturnValue(txHash);
        var e = this.errorCodes(payload.method, payload.returns, loggedReturnValue);
        if (e && e.error) {
            callReturn = this.fire(payload);
            console.debug("getLoggedReturnValue failed, fire returns:", callReturn);
            throw new Error(e);
        }
        tx.callReturn = this.applyReturns(payload.returns, loggedReturnValue);
        return tx;
    },

    transact: function (payload, onSent, onSuccess, onFailed) {
        var self = this;
        if (this.debug.tx) console.debug("payload transact:", payload);
        payload.send = false;

        // synchronous / blocking transact sequence
        if (!isFunction(onSent)) return this.transactSync(payload);

        // asynchronous / non-blocking transact sequence
        onSuccess = (isFunction(onSuccess)) ? onSuccess : noop;
        onFailed = (isFunction(onFailed)) ? onFailed : noop;
        if (payload.mutable || payload.returns === "null") {
            return this.transactAsync(payload, null, onSent, onSuccess, onFailed);
        }
        this.fire(payload, function (callReturn) {
            if (self.debug.tx) console.debug("callReturn:", callReturn);
            if (callReturn === undefined || callReturn === null) {
                return onFailed(errors.NULL_CALL_RETURN);
            } else if (callReturn.error) {
                return onFailed(callReturn);
            }
            self.transactAsync(payload, callReturn, onSent, onSuccess, onFailed);
        });
    }
};
