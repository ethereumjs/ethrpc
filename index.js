/**
 * Basic JSON RPC methods for Ethereum
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var NODE_JS = (typeof module !== "undefined") && process && !process.browser;

var http = require("http");
var url = require("url");
var BigNumber = require("bignumber.js");
var request = (NODE_JS) ? require("sync-request") : null;
var abi = require("augur-abi");
var errors = require("./errors");
var log = console.log;

BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

module.exports = {

    debug: false,

    bignumbers: true,

    // Maximum number of transaction verification attempts
    TX_POLL_MAX: 12,

    // Transaction polling interval
    TX_POLL_INTERVAL: 12000,

    DEFAULT_GAS: "0x2fd618",

    ETHER: new BigNumber(10).toPower(18),

    nodes: ["http://eth1.augur.net:8545"],

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
            if (response !== undefined) {
                response = JSON.parse(response);
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
                        if (response.error) {
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
                    if (callback) {
                        callback(response);
                    } else {
                        return response;
                    }
                }
            }
        } catch (e) {
            if (callback) {
                callback(e);
            } else {
                return e;
            }
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

    postSync: function (rpc_url, command, returns) {
        var req = null;
        if (NODE_JS) {
            return this.parse(request('POST', rpc_url, {
                json: command
            }).getBody().toString(), returns);
        } else {
            if (window.XMLHttpRequest) {
                req = new window.XMLHttpRequest();
            } else {
                req = new window.ActiveXObject("Microsoft.XMLHTTP");
            }
            req.open("POST", rpc_url, false);
            req.setRequestHeader("Content-type", "application/json");
            req.send(command);
            return this.parse(req.responseText, returns);
        }
    },

    post: function (rpc_url, command, returns, callback) {
        var req, self = this;
        if (NODE_JS) {
            var rpc_obj = url.parse(rpc_url);
            req = http.request({
                host: rpc_obj.hostname,
                port: rpc_obj.port,
                path: '/',
                method: "POST",
                headers: {"Content-type": "application/json"}
            }, function (response) {
                var str = '';
                response.on('data', function (chunk) {
                    str += chunk;
                });
                response.on('end', function () {
                    if (str) self.parse(str, returns, callback);
                });
            });
            req.on("error", function (err) {
                if (self.debug) {
                    log("RPC request to", rpc_url, "failed:", err.code);
                }
                if (rpc_url.indexOf(".augur.net") === -1) {
                    self.nodes.splice(self.nodes.indexOf(rpc_url), 1);
                }
                callback();
            });
            req.write(command);
            req.end();
        } else {
            if (window.XMLHttpRequest) {
                req = new window.XMLHttpRequest();
            } else {
                req = new window.ActiveXObject("Microsoft.XMLHTTP");
            }
            req.onreadystatechange = function () {
                if (req.readyState === 4) {
                    self.parse(req.responseText, returns, callback);
                } else {
                    if (rpc_url.indexOf(".augur.net") === -1) {
                        self.nodes.splice(self.nodes.indexOf(rpc_url), 1);
                    }
                    callback();
                }
            };
            req.onerror = function () {
                if (rpc_url.indexOf(".augur.net") === -1) {
                    self.nodes.splice(self.nodes.indexOf(rpc_url), 1);
                }
                callback();
            };
            req.open("POST", rpc_url, true);
            req.setRequestHeader("Content-type", "application/json");
            req.send(command);
        }
    },

    // Post JSON-RPC command to all Ethereum nodes
    broadcast: function (command, callback) {
        var i, j, num_nodes, num_commands, returns, result, complete;

        // make sure the ethereum node list isn't empty
        if (!this.nodes || !this.nodes.length) {
            if (callback && callback.constructor === Function) {
                return callback(errors.ETHEREUM_NOT_FOUND);
            } else {
                return errors.ETHEREUM_NOT_FOUND;
            }
        }

        // parse batched commands and strip "returns" fields
        if (command.constructor === Array) {
            num_commands = command.length;
            returns = new Array(num_commands);
            for (i = 0; i < num_commands; ++i) {
                returns[i] = this.stripReturns(command[i]);
            }
        } else {
            returns = this.stripReturns(command);
        }

        // asynchronous request if callback exists
        if (callback && callback.constructor === Function) {
            var self = this;
            command = JSON.stringify(command);
            num_nodes = this.nodes.length;
            for (j = 0; j < num_nodes; ++j) {
                (function (node) {
                    self.post(node, command, returns, function (result) {
                        if (result !== undefined &&
                            result !== "0x" && !result.error)
                        {
                            if (!complete) callback(result);
                            complete = true;
                        }
                    });
                })(this.nodes[j]);
            }

        // use synchronous http if no callback provided
        } else {
            if (!NODE_JS) command = JSON.stringify(command);
            num_nodes = this.nodes.length;
            for (j = 0; j < num_nodes; ++j) {
                try {
                    result = this.postSync(this.nodes[j], command, returns);
                } catch (e) {
                    if (this.debug) {
                        log("RPC request to", this.nodes[j], "failed:", e);
                    }
                    if (this.nodes[j].indexOf(".augur.net") === -1) {
                        this.nodes.splice(j--, 1);
                    }
                }
                if (result && result !== "0x") return result;
            }
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
                address || this.eth("coinbase"), block || "latest"
            ]), f
        );
    },
    getBalance: function (address, block, f) {
        return this.broadcast(
            this.marshal("getBalance", [
                address || this.eth("coinbase"), block || "latest"
            ]), f
        );
    },

    txCount: function (address, f) {
        return this.broadcast(
            this.marshal("getTransactionCount", address || this.eth("coinbase")), f
        );
    },
    getTransactionCount: function (address, f) {
        return this.broadcast(
            this.marshal("getTransactionCount", address || this.eth("coinbase")), f
        );
    },

    sendEther: function (to, value, from, onSent, onSuccess, onFailed) {
        from = from || this.broadcast(this.marshal("coinbase"));
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
        return this.broadcast(this.marshal("getBlockByHash", [hash, full || false]), f);
    },

    getBlock: function (number, full, f) {
        return this.broadcast(this.marshal("getBlockByNumber", [number, full || false]), f);
    },
    getBlockByNumber: function (number, full, f) {
        return this.broadcast(this.marshal("getBlockByNumber", [number, full || false]), f);
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
        tx.gas = (tx.gas) ? abi.prefix_hex(tx.gas.toString(16)) : this.DEFAULT_GAS;
        return this.broadcast(this.marshal("call", tx), f);
    },

    sendTx: function (tx, f) {
        tx.to = tx.to || "";
        tx.gas = (tx.gas) ? abi.prefix_hex(tx.gas.toString(16)) : this.DEFAULT_GAS;
        return this.broadcast(this.marshal("sendTransaction", tx), f);
    },
    sendTransaction: function (tx, f) {
        tx.to = tx.to || "";
        tx.gas = (tx.gas) ? abi.prefix_hex(tx.gas.toString(16)) : this.DEFAULT_GAS;
        return this.broadcast(this.marshal("sendTransaction", tx), f);
    },

    // IN: RLP(tx.signed(privateKey))
    // OUT: txhash
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

    // publish a new contract to the blockchain (from the coinbase account)
    publish: function (compiled, f) {
        return this.sendTx({ from: this.eth("coinbase"), data: compiled }, f);
    },

    // Read the code in a contract on the blockchain
    read: function (address, block, f) {
        return this.broadcast(this.marshal("getCode", [address, block || "latest"]), f);
    },
    getCode: function (address, block, f) {
        return this.broadcast(this.marshal("getCode", [address, block || "latest"]), f);
    },

    listening: function () {
        try {
            return this.net("listening");
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
                        from: tx.from || this.eth("coinbase"),
                        to: tx.to,
                        data: data_abi
                    };
                    if (tx.value) packaged.value = tx.value;
                    if (tx.returns) packaged.returns = tx.returns;
                    invocation = (tx.send) ? this.sendTx : this.call;
                    invoked = true;
                    return invocation.call(this, packaged, f);
                }
            }
        }
        if (!invoked) {
            if (f) {
                f(errors.TRANSACTION_FAILED);
            } else {
                return errors.TRANSACTION_FAILED;
            }
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
                        from: tx.from || this.eth("coinbase"),
                        to: tx.to,
                        data: data_abi
                    };
                    if (tx.value) packaged.value = tx.value;
                    if (tx.returns) packaged.returns = tx.returns;
                    invocation = (tx.send) ? "sendTransaction" : "call";
                    rpclist[i] = this.marshal(invocation, packaged);
                } else {
                    log("unable to package commands for batch RPC");
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
            log("expected array for batch RPC, invoking instead");
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
        if (response && response.constructor === Array) {
            for (var i = 0, len = response.length; i < len; ++i) {
                response[i] = this.errorCodes(tx.method, response[i]);
            }
        } else {
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
                    var response_number = abi.bignum(response);
                    if (response_number) {
                        response_number = abi.bignum(response).toFixed();
                        if (errors[tx.method] && errors[tx.method][response_number]) {
                            response = {
                                error: response_number,
                                message: errors[tx.method][response_number]
                            };
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
                callback(this.encodeResult(
                    this.errorCodes(tx, res),
                    itx.returns
                ));
            }.bind(this));
        } else {
            return this.encodeResult(
                this.errorCodes(tx, this.invoke(tx)),
                itx.returns
            );
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
                            from: sent.from || self.eth("coinbase"),
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
