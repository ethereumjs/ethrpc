/**
 * Basic JSON RPC methods for Ethereum
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var NODE_JS = (typeof module !== "undefined") && process && !process.browser;

var async = require("async");
var BigNumber = require("bignumber.js");
var request = require("request");
var syncRequest = (NODE_JS) ? require("sync-request") : null;
var abi = require("augur-abi");
var errors = require("./errors");

BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

function RPCError(err) {
    this.message = err.error || err.name + ": " + err.message;
}

RPCError.prototype = new Error();

function rotate(a) { a.unshift(a.pop()); }

var HOSTED_NODES = [
    "http://eth3.augur.net",
    "http://eth1.augur.net",
    "http://eth4.augur.net",
    "http://eth5.augur.net"
];

module.exports = {

    debug: false,

    bignumbers: true,

    rotation: true,

    RPCError: RPCError,

    // Maximum number of transaction verification attempts
    TX_POLL_MAX: 24,

    // Transaction polling interval
    TX_POLL_INTERVAL: 12000,

    POST_TIMEOUT: 180000,

    DEFAULT_GAS: "0x2fd618",

    ETHER: new BigNumber(10).toPower(18),

    nodes: {
        hosted: HOSTED_NODES.slice(),
        local: null
    },

    requests: 1,

    notifications: {},

    unmarshal: function (string, returns, stride, init) {
        var elements, array, position;
        if (string.length >= 66) {
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
                if (returns === "hash[]" && this.bignumbers) {
                    array[i] = abi.bignum(array[i]);
                } else {
                    if (returns === "number[]") {
                        array[i] = abi.bignum(array[i]).toFixed();
                    } else if (returns === "unfix[]") {
                        if (this.bignumbers) {
                            array[i] = abi.unfix(array[i]);
                        } else {
                            array[i] = abi.unfix(array[i], "string");
                        }
                    }
                }
            }
            return array;
        } else {
            return string;
        }
    },

    applyReturns: function (returns, result) {
        returns = returns.toLowerCase();
        if (result && result !== "0x") {
            if (returns && returns.slice(-2) === "[]") {
                result = this.unmarshal(result, returns);
            } else if (returns === "string") {
                result = abi.decode_hex(result, true);
            } else {
                if (this.bignumbers) {
                    if (returns === "unfix") {
                        result = abi.unfix(result);
                    }
                    if (result.constructor !== BigNumber) {
                        result = abi.bignum(result);
                    }
                } else {
                    if (returns === "number") {
                        result = abi.bignum(result).toFixed();
                    } else if (returns === "bignumber") {
                        result = abi.bignum(result);
                    } else if (returns === "unfix") {
                        result = abi.unfix(result, "string");
                    }
                }
            }
        }
        return result;
    },

    parse: function (response, returns, callback) {
        var results, len;
        try {
            if (response && typeof response === "string") {
                response = JSON.parse(response);
            }
            if (response && typeof response === "object" && response !== null) {
                if (response.error) {
                    response = {
                        error: response.error.code,
                        message: response.error.message
                    };
                    if (callback) {
                        callback(response);
                    } else {
                        return response;
                    }
                } else if (response.result !== undefined) {
                    if (returns) {
                        response.result = this.applyReturns(returns, response.result);
                    } else {
                        if (response.result && response.result.length > 2 &&
                            response.result.slice(0,2) === "0x")
                        {
                            response.result = abi.remove_leading_zeros(response.result);
                            response.result = abi.prefix_hex(response.result);
                        }
                    }
                    if (callback) {
                        callback(response.result);
                    } else {
                        return response.result;
                    }
                } else if (response.constructor === Array && response.length) {
                    len = response.length;
                    results = new Array(len);
                    for (var i = 0; i < len; ++i) {
                        results[i] = response[i].result;
                        if (response.error || (response[i] && response[i].error)) {
                            console.error(
                                "[" + response.error.code + "]",
                                response.error.message
                            );
                        } else if (response[i].result !== undefined) {
                            if (returns[i]) {
                                results[i] = this.applyReturns(returns[i], response[i].result);
                            } else {
                                results[i] = abi.remove_leading_zeros(results[i]);
                                results[i] = abi.prefix_hex(results[i]);
                            }
                        }
                    }
                    if (callback) {
                        callback(results);
                    } else {
                        return results;
                    }

                // no result or error field
                } else {
                    var err = errors.NO_RESPONSE;
                    err.response = response;
                    return console.error(err);
                }
            }
        } catch (e) {
            var err = e;
            if (e && e.name === "SyntaxError") {
                err = errors.INVALID_RESPONSE;
                err.response = response;
            }
            console.error(err);
            console.log(err.stack);
            // throw new RPCError(err);
        }
    },

    stripReturns: function (tx) {
        var returns;
        if (tx.params !== undefined && tx.params.length &&
            tx.params[0] && tx.params[0].returns)
        {
            returns = tx.params[0].returns;
            delete tx.params[0].returns;
        }
        return returns;
    },

    exciseNode: function (err, deadNode, callback) {
        if (deadNode && !this.nodes.local) {
            if (this.debug) {
                console.log("[ethrpc] request to", deadNode, "failed:", err);
            }
            var deadIndex = this.nodes.hosted.indexOf(deadNode);
            if (deadIndex > -1) {
                this.nodes.hosted.splice(deadIndex, 1);
                if (!this.nodes.hosted.length) {
                    if (callback) {
                        callback(errors.HOSTED_NODE_FAILURE);
                    } else {
                        throw new RPCError(errors.HOSTED_NODE_FAILURE);
                    }
                }
            }
            if (callback) callback();
        }
    },

    postSync: function (rpcUrl, command, returns) {
        var req = null;
        if (NODE_JS) {
            req = syncRequest('POST', rpcUrl, { json: command });
            var response = req.getBody().toString();
            return this.parse(response, returns);
        } else {
            if (window.XMLHttpRequest) {
                req = new window.XMLHttpRequest();
            } else {
                req = new window.ActiveXObject("Microsoft.XMLHTTP");
            }
            req.open("POST", rpcUrl, false);
            req.setRequestHeader("Content-type", "application/json");
            req.send(JSON.stringify(command));
            return this.parse(req.responseText, returns);
        }
    },

    post: function (rpcUrl, command, returns, callback) {
        var req, self = this;
        if (NODE_JS) {
            request({
                url: rpcUrl,
                method: 'POST',
                json: command,
                timeout: this.POST_TIMEOUT
            }, function (err, response, body) {
                if (err) {
                    if (self.nodes.local) {
                        var e = errors.LOCAL_NODE_FAILURE;
                        e.detail = err;
                        return callback(e);
                    }
                    self.exciseNode(err.code, rpcUrl, callback);
                } else if (response.statusCode === 200) {
                    self.parse(body, returns, callback);
                }
            });
        } else {
            if (window.XMLHttpRequest) {
                req = new window.XMLHttpRequest();
            } else {
                req = new window.ActiveXObject("Microsoft.XMLHTTP");
            }
            req.onreadystatechange = function () {
                if (req.readyState === 4) {
                    self.parse(req.responseText, returns, callback);
                }
            };
            req.onerror = req.ontimeout = function (err) {
                self.exciseNode(err, rpcUrl);
                callback();
            };
            req.open("POST", rpcUrl, true);
            req.setRequestHeader("Content-type", "application/json");
            req.send(JSON.stringify(command));
        }
    },

    // Post JSON-RPC command to all Ethereum nodes
    broadcast: function (command, callback) {
        var self, nodes, num_commands, returns, result, completed;

        // make sure the ethereum node list isn't empty
        if (!this.nodes.local && !this.nodes.hosted.length) {
            if (callback && callback.constructor === Function) {
                return callback(errors.ETHEREUM_NOT_FOUND);
            } else {
                throw new RPCError(errors.ETHEREUM_NOT_FOUND);
            }
        }
        if (this.rotation && !this.nodes.local && this.nodes.hosted.length > 1) {
            rotate(this.nodes.hosted);
        }
        nodes = (this.nodes.local) ? [this.nodes.local] : this.nodes.hosted.slice();

        // parse batched commands and strip "returns" fields
        if (command.constructor === Array) {
            num_commands = command.length;
            returns = new Array(num_commands);
            for (var i = 0; i < num_commands; ++i) {
                returns[i] = this.stripReturns(command[i]);
            }
        } else {
            returns = this.stripReturns(command);
        }

        // asynchronous request if callback exists
        if (callback && callback.constructor === Function) {
            self = this;
            async.eachSeries(nodes, function (node, nextNode) {
                if (!completed) {
                    if (self.debug) {
                        console.log("nodes:", JSON.stringify(nodes));
                        console.log("post", command.method, "to:", node);
                    }
                    self.post(node, command, returns, function (res) {
                        if (self.debug) {
                            if (res && res.constructor === BigNumber) {
                                console.log(node, "response:", res.toFixed());
                            } else {
                                console.log(node, "response:", res);
                            }
                        }
                        if (node === nodes[nodes.length - 1] ||
                            (res !== undefined && res !== null &&
                            !res.error && res !== "0x"))
                        {
                            completed = true;
                            return nextNode(res);
                        }
                        nextNode();
                    });
                }
            }, callback);

        // use synchronous http if no callback provided
        } else {
            for (var j = 0, len = nodes.length; j < len; ++j) {
                try {
                    result = this.postSync(nodes[j], command, returns);
                } catch (e) {
                    if (this.nodes.local) {
                        throw new RPCError(errors.LOCAL_NODE_FAILURE);
                    } else {
                        this.exciseNode(e, nodes[j]);
                    }
                }
                if (result) return result;
            }
            throw new RPCError(errors.NO_RESPONSE);
        }
    },

    marshal: function (command, params, prefix) {
        var payload = {
            id: this.requests++,
            jsonrpc: "2.0"
        };
        if (prefix === "null") {
            payload.method = command.toString();
        } else {
            payload.method = (prefix || "eth_") + command.toString();
        }
        if (params !== undefined && params !== null) {
            if (params.constructor === Array) {
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
        this.nodes.local = urlstr;
    },

    useHostedNode: function () {
        this.nodes.local = null;
    },

    // reset to default Ethereum nodes
    reset: function () {
        this.nodes = {
            hosted: HOSTED_NODES.slice(),
            local: null
        };
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

    leveldb: function (command, params, f) {
        return this.broadcast(this.marshal(command, params, "db_"), f);
    },

    shh: function (command, params, f) {
        return this.broadcast(this.marshal(command, params, "shh_"), f);
    },

    sha3: function (data, f) {
        return this.broadcast(this.marshal("sha3", data.toString(), "web3_"), f);
    },
    hash: function (data, f) {
        return this.broadcast(this.marshal("sha3", data.toString(), "web3_"), f);
    },

    gasPrice: function (f) {
        return this.broadcast(this.marshal("gasPrice"), f);
    },

    blockNumber: function (f) {
        if (f) {
            this.broadcast(this.marshal("blockNumber"), f);
        } else {
            return parseInt(this.broadcast(this.marshal("blockNumber")));
        }
    },

    coinbase: function (f) {
        return this.broadcast(this.marshal("coinbase"), f);
    },

    balance: function (address, block, f) {
        return this.broadcast(
            this.marshal("getBalance", [
                address || this.coinbase(), block || "latest"
            ]), f
        );
    },
    getBalance: function (address, block, f) {
        return this.broadcast(
            this.marshal("getBalance", [
                address || this.coinbase(), block || "latest"
            ]), f
        );
    },

    txCount: function (address, f) {
        return this.broadcast(
            this.marshal("getTransactionCount", address || this.coinbase()), f
        );
    },
    getTransactionCount: function (address, f) {
        return this.broadcast(
            this.marshal("getTransactionCount", address || this.coinbase()), f
        );
    },

    sendEther: function (to, value, from, onSent, onSuccess, onFailed) {
        from = from || this.coinbase();
        var tx, txhash;
        if (to && to.value) {
            value = to.value;
            if (to.from) from = to.from;
            if (to.onSent) onSent = to.onSent;
            if (to.onSuccess) onSuccess = to.onSuccess;
            if (to.onFailed) onFailed = to.onFailed;
            to = to.to;
        }
        tx = {
            from: from,
            to: to,
            value: abi.bignum(value).mul(this.ETHER).toFixed()
        };
        if (onSent) {
            this.sendTx(tx, function (txhash) {
                if (txhash) {
                    onSent(txhash);
                    if (onSuccess)
                        this.txNotify(0, value, tx, txhash, null, onSent, onSuccess, onFailed);
                }
            }.bind(this));
        } else {
            txhash = this.sendTx(tx);
            if (txhash) {
                if (onSuccess)
                    this.txNotify(0, value, tx, txhash, null, onSent, onSuccess, onFailed);
                return txhash;
            }
        }
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
        if (f) {
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
        if (f) {
            this.broadcast(this.marshal("hashrate"), f);
        } else {
            return parseInt(this.broadcast(this.marshal("hashrate")));
        }
    },

    getBlockByHash: function (hash, full, f) {
        return this.broadcast(this.marshal("getBlockByHash", [hash, full || true]), f);
    },

    getBlock: function (number, full, f) {
        return this.broadcast(this.marshal("getBlockByNumber", [number, full || true]), f);
    },
    getBlockByNumber: function (number, full, f) {
        return this.broadcast(this.marshal("getBlockByNumber", [number, full || true]), f);
    },

    version: function (f) {
        return this.broadcast(this.marshal("version", [], "net_"), f);
    },
    netVersion: function (f) {
        return this.broadcast(this.marshal("version", [], "net_"), f);
    },

    // estimate a transaction's gas cost
    estimateGas: function (tx, f) {
        tx.to = tx.to || "";
        return this.broadcast(this.marshal("estimateGas", tx), f);
    },

    // execute functions on contracts on the blockchain
    call: function (tx, f) {
        tx.to = tx.to || "";
        tx.gas = (tx.gas) ? tx.gas : this.DEFAULT_GAS;
        return this.broadcast(this.marshal("call", tx), f);
    },

    sendTx: function (tx, f) {
        tx.to = tx.to || "";
        tx.gas = (tx.gas) ? tx.gas : this.DEFAULT_GAS;
        return this.broadcast(this.marshal("sendTransaction", tx), f);
    },
    sendTransaction: function (tx, f) {
        tx.to = tx.to || "";
        tx.gas = (tx.gas) ? tx.gas : this.DEFAULT_GAS;
        return this.broadcast(this.marshal("sendTransaction", tx), f);
    },

    // sendRawTx(RLP(tx.signed(privateKey))) -> txhash
    sendRawTx: function (rawTx, f) {
        return this.broadcast(this.marshal("sendRawTransaction", rawTx), f);
    },
    sendRawTransaction: function (rawTx, f) {
        return this.broadcast(this.marshal("sendRawTransaction", rawTx), f);
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

    // publish a new contract to the blockchain (from the coinbase account)
    publish: function (compiled, f) {
        return this.sendTx({ from: this.coinbase(), data: compiled }, f);
    },

    // Read the code in a contract on the blockchain
    read: function (address, block, f) {
        return this.broadcast(this.marshal("getCode", [address, block || "latest"]), f);
    },
    getCode: function (address, block, f) {
        return this.broadcast(this.marshal("getCode", [address, block || "latest"]), f);
    },

    // Ethereum node status checks

    listening: function (f) {
        var response, self = this;
        try {
            if (!this.nodes.hosted.length && !this.nodes.local) {
                throw new RPCError(errors.ETHEREUM_NOT_FOUND);
            }
            if (f && f.constructor === Function) {
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
            if (f && f.constructor === Function) {
                f(false);
            } else {
                return false;
            }
        }
    },

    unlocked: function (account) {
        if (!this.nodes.hosted.length && !this.nodes.local) {
            throw new RPCError(errors.ETHEREUM_NOT_FOUND);
        }
        try {
            if (this.sign(account || this.coinbase(), "1010101").error) {
                return false;
            }
            return true;
        } catch (e) {
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
    invoke: function (itx, f) {
        var tx, data_abi, packaged, invocation, invoked;
        try {
            if (itx) {
                if (itx.send && itx.invocation && itx.invocation.invoke &&
                    itx.invocation.invoke.constructor === Function)
                {
                    return itx.invocation.invoke.call(itx.invocation.context, itx, f);
                } else {
                    tx = abi.copy(itx);
                    if (tx.params !== undefined) {
                        if (tx.params.constructor === Array) {
                            for (var i = 0, len = tx.params.length; i < len; ++i) {
                                if (tx.params[i] !== undefined &&
                                    tx.params[i].constructor === BigNumber) {
                                    tx.params[i] = tx.params[i].toFixed();
                                }
                            }
                        } else if (tx.params.constructor === BigNumber) {
                            tx.params = tx.params.toFixed();
                        }
                    }
                    if (tx.to) tx.to = abi.prefix_hex(tx.to);
                    if (tx.from) tx.from = abi.prefix_hex(tx.from);
                    data_abi = abi.encode(tx);
                    if (data_abi) {
                        packaged = {
                            from: tx.from || this.coinbase(),
                            to: tx.to,
                            data: data_abi,
                            gas: tx.gas || this.DEFAULT_GAS,
                            gasPrice: tx.gasPrice || this.gasPrice()
                        };
                        if (tx.value) packaged.value = tx.value;
                        if (tx.returns) packaged.returns = tx.returns;
                        invocation = (tx.send) ? this.sendTx : this.call;
                        invoked = true;
                        return invocation.call(this, packaged, f);
                    }
                }
            }

        // stopgap: console.error
        } catch (exc) {
            if (f) return f(errors.TRANSACTION_FAILED);
            console.error(errors.TRANSACTION_FAILED);
        }
        if (!invoked) {
            if (f) return f(errors.TRANSACTION_FAILED);
            console.error(errors.TRANSACTION_FAILED);
        }
    },

    /**
     * Batched RPC commands
     */
    batch: function (txlist, f) {
        var num_commands, rpclist, callbacks, tx, data_abi, packaged, invocation;
        if (txlist.constructor === Array) {
            num_commands = txlist.length;
            rpclist = new Array(num_commands);
            callbacks = new Array(num_commands);
            for (var i = 0; i < num_commands; ++i) {
                tx = abi.copy(txlist[i]);
                if (tx.params !== undefined) {
                    if (tx.params.constructor === Array) {
                        for (var j = 0, len = tx.params.length; j < len; ++j) {
                            if (tx.params[j] !== undefined &&
                                tx.params[j] !== null &&
                                tx.params[j].constructor === BigNumber) {
                                tx.params[j] = tx.params[j].toFixed();
                            }
                        }
                    } else if (tx.params.constructor === BigNumber) {
                        tx.params = tx.params.toFixed();
                    }
                }
                if (tx.from) tx.from = abi.prefix_hex(tx.from);
                tx.to = abi.prefix_hex(tx.to);
                data_abi = abi.encode(tx);
                if (data_abi) {
                    if (tx.callback && tx.callback.constructor === Function) {
                        callbacks[i] = tx.callback;
                        delete tx.callback;
                    }
                    packaged = {
                        from: tx.from || this.coinbase(),
                        to: tx.to,
                        data: data_abi,
                        gas: tx.gas || this.DEFAULT_GAS,
                        gasPrice: tx.gasPrice || this.gasPrice()
                    };
                    if (tx.value) packaged.value = tx.value;
                    if (tx.returns) packaged.returns = tx.returns;
                    invocation = (tx.send) ? "sendTransaction" : "call";
                    rpclist[i] = this.marshal(invocation, packaged);
                } else {
                    console.log("unable to package commands for batch RPC");
                    return rpclist;
                }
            }
            if (f) {
                if (f.constructor === Function) { // callback on whole array
                    this.broadcast(rpclist, f);
                } else if (f === true) {
                    this.broadcast(rpclist, function (res) {
                        if (res) {
                            if (res.constructor === Array && res.length) {
                                for (j = 0; j < num_commands; ++j) {
                                    if (res[j] && callbacks[j]) {
                                        callbacks[j](res[j]);
                                    }
                                }
                            } else {
                                if (callbacks.length && callbacks[0]) {
                                    callbacks[0](res);
                                }
                            }
                        }
                    });
                }
            } else {
                return this.broadcast(rpclist, f);
            }
        } else {
            console.log("expected array for batch RPC, invoking instead");
            return this.invoke(txlist, f);
        }
    },

    clearNotifications: function (id) {
        for (var i = 0, len = this.notifications.length; i < len; ++i) {
            clearTimeout(this.notifications[id][i]);
            this.notifications[id] = [];
        }
    },

    encodeResult: function (result, returns) {
        if (result) {
            if (returns === "null") {
                result = null;
            } else if (returns === "address" || returns === "address[]") {
                result = abi.prefix_hex(abi.remove_leading_zeros(result));
            } else {
                if (this.bignumbers && returns !== "string") {
                    result = abi.bignum(result);
                }
                if (!this.bignumbers) {
                    if (!returns || returns === "hash[]" || returns === "hash") {
                        result = abi.bignum(result, "hex");
                    } else if (returns === "number") {
                        result = abi.bignum(result, "string");
                    }
                }
            }
        }
        return result;
    },

    errorCodes: function (tx, response) {
        if (response) {
            if (response.constructor === Array) {
                for (var i = 0, len = response.length; i < len; ++i) {
                    response[i] = this.errorCodes(tx.method, response[i]);
                }
            } else if (response.name && response.message && response.stack) {
                response.error = response.name;
            } else if (!response.error) {
                if (errors[response]) {
                    response = {
                        error: response,
                        message: errors[response]
                    };
                } else {
                    if (tx.returns && tx.returns !== "string" ||
                        (response && response.constructor === String &&
                        response.slice(0,2) === "0x"))
                    {
                        var responseNumber = abi.bignum(response);
                        if (responseNumber) {
                            responseNumber = responseNumber.toFixed();
                            if (errors[tx.method] && errors[tx.method][responseNumber]) {
                                response = {
                                    error: responseNumber,
                                    message: errors[tx.method][responseNumber]
                                };
                            }
                        }
                    }
                }
            }
        }
        return response;
    },

    fire: function (itx, callback) {
        var tx = abi.copy(itx);
        if (callback) {
            this.invoke(tx, function (res) {
                res = this.errorCodes(tx, res);
                if (res) {
                    if (res.error) return callback(res);
                    return callback(this.encodeResult(res, itx.returns));
                }
                callback(errors.NO_RESPONSE);
            }.bind(this));
        } else {
            var res = this.errorCodes(tx, this.invoke(tx));
            if (res) {
                if (res.error) return res;
                return this.encodeResult(res, itx.returns);
            }
            throw new RPCError(errors.NO_RESPONSE);
        }
    },

    /***************************************
     * Send-call-confirm callback sequence *
     ***************************************/

    checkBlockHash: function (tx, callreturn, itx, txhash, returns, count, onSent, onSuccess, onFailed) {
        if (tx && tx.blockHash && abi.bignum(tx.blockHash).toNumber() !== 0) {
            this.clearNotifications(txhash);
            tx.callReturn = this.encodeResult(callreturn, returns);
            tx.txHash = tx.hash;
            delete tx.hash;
            if (onSuccess && onSuccess.constructor === Function) onSuccess(tx);
        } else {
            if (count !== undefined) {
                if (count < this.TX_POLL_MAX) {
                    if (count === 0) {
                        this.notifications[txhash] = [setTimeout(function () {
                            this.txNotify(count + 1, callreturn, itx, txhash, returns, onSent, onSuccess, onFailed);
                        }.bind(this), this.TX_POLL_INTERVAL)];
                    } else {
                        this.notifications[txhash].push(setTimeout(function () {
                            this.txNotify(count + 1, callreturn, itx, txhash, returns, onSent, onSuccess, onFailed);
                        }.bind(this), this.TX_POLL_INTERVAL));
                    }
                } else {
                    if (onFailed && onFailed.constructor === Function) {
                        onFailed(errors.TRANSACTION_NOT_CONFIRMED);
                    }
                }
            }
        }
    },

    txNotify: function (count, callreturn, itx, txhash, returns, onSent, onSuccess, onFailed) {
        this.getTx(txhash, function (tx) {
            if (tx === null) {
                if (returns) itx.returns = returns;
            } else {
                this.checkBlockHash(tx, callreturn, itx, txhash, returns, count, onSent, onSuccess, onFailed);
            }
        }.bind(this));
    },

    confirmTx: function (tx, txhash, returns, onSent, onSuccess, onFailed) {
        var self = this;
        if (tx && txhash) {
            this.notifications[txhash] = [];
            if (errors[txhash]) {
                if (onFailed) onFailed({
                    error: txhash,
                    message: errors[txhash]
                });
            } else {
                this.getTx(txhash, function (sent) {
                    if (returns !== "null") {
                        self.call({
                            from: sent.from || self.coinbase(),
                            to: sent.to || tx.to,
                            value: sent.value || tx.value,
                            data: sent.input
                        }, function (callReturn) {
                            if (callReturn) {
                                callReturn = JSON.stringify({ result: callReturn });

                                // transform callReturn to a number
                                var numReturn = self.parse(callReturn, "number");

                                // check if numReturn is an error object
                                if (numReturn.constructor === Object && numReturn.error) {
                                    if (onFailed) onFailed(numReturn);
                                } else if (errors[numReturn]) {
                                    if (onFailed) onFailed({
                                        error: numReturn,
                                        message: errors[numReturn]
                                    });
                                } else {
                                    try {

                                        // check if numReturn is an error code
                                        if (numReturn && numReturn.constructor === BigNumber) {
                                            numReturn = numReturn.toFixed();
                                        }
                                        if (numReturn && errors[tx.method] && errors[tx.method][numReturn]) {
                                            if (onFailed) onFailed({
                                                error: numReturn,
                                                message: errors[tx.method][numReturn]
                                            });
                                        } else {

                                            // no errors found, so transform to the requested
                                            // return type, specified by "returns" parameter
                                            callReturn = self.parse(callReturn, returns);

                                            // send the transaction hash and return value back
                                            // to the client, using the onSent callback
                                            onSent({
                                                txHash: txhash,
                                                callReturn: self.encodeResult(callReturn, returns)
                                            });

                                            // if an onSuccess callback was supplied, then
                                            // poll the network until the transaction is
                                            // included in a block (i.e., has a non-null
                                            // blockHash field)
                                            if (onSuccess) {
                                                self.txNotify(
                                                    0,
                                                    callReturn,
                                                    tx,
                                                    txhash,
                                                    returns,
                                                    onSent,
                                                    onSuccess,
                                                    onFailed
                                                );
                                            }
                                        }

                                    // something went wrong :(
                                    } catch (e) {
                                        if (onFailed) onFailed(e);
                                    }
                                }
                            }
                        });

                    // if returns type is null, skip the intermediate call
                    } else {
                        onSent({ txHash: txhash, callReturn: null });
                        if (onSuccess) {
                            self.txNotify(
                                0,
                                null,
                                tx,
                                txhash,
                                returns,
                                onSent,
                                onSuccess,
                                onFailed
                            );
                        }
                    }
                });
            }
        }
    },

    transact: function (tx, onSent, onSuccess, onFailed) {
        var returns = tx.returns;
        tx.send = true;
        delete tx.returns;
        if (onSent && onSent.constructor === Function) {
            this.invoke(tx, function (txhash) {
                if (txhash.error) {
                    if (onFailed) onFailed(txhash);
                } else {
                    if (tx.invocation) delete tx.invocation;
                    txhash = abi.prefix_hex(abi.pad_left(abi.strip_0x(txhash)));
                    this.confirmTx(tx, txhash, returns, onSent, onSuccess, onFailed);
                }
            }.bind(this));
        } else {
            return this.invoke(tx);
        }
    }

};
