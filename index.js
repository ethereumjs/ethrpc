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
var BigNumber = require("bignumber.js");
var contracts = require("augur-contracts");
var abi = require("augur-abi");
var errors = contracts.errors;

BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

function RPCError(err) {
    this.name = err.error || err.name;
    this.message = (err.error || err.name) + ": " + err.message;
}

RPCError.prototype = new Error();

function isFunction(f) {
    return Object.prototype.toString.call(f) === "[object Function]";
}

var HOSTED_NODES = [
    "https://eth1.augur.net",
    "https://eth3.augur.net",
    "https://eth4.augur.net",
    "https://eth5.augur.net"
];

module.exports = {

    debug: {
        tx: false,
        broadcast: false,
        fallback: false,
        latency: true,
        logs: false
    },

    // network load balancer
    balancer: true,

    // remove unresponsive nodes
    excision: false,

    // use IPC (only available on Node + Linux/OSX)
    ipcpath: null,

    // local ethereum node address
    localnode: "http://127.0.0.1:8545",

    // Maximum number of transaction verification attempts
    TX_POLL_MAX: 72,

    // Transaction polling interval
    TX_POLL_INTERVAL: 3000,

    // Default timeout for asynchronous POST
    POST_TIMEOUT: 30000,

    BALANCER_SAMPLES: 20,

    DEFAULT_GAS: "0x2fd618",

    ETHER: new BigNumber(10).toPower(18),

    Error: RPCError,

    errors: errors,

    nodes: {
        hosted: HOSTED_NODES.slice(),
        local: null
    },

    primaryNode: null,

    // Mean network latency for each node
    latency: {},

    // Number of latency samples taken for each node
    samples: {},

    // Unweighted mean network latency across all nodes
    // (use debug.latency=true to see this)
    netLatency: null,

    // Total number of samples taken across all nodes
    // (use debug.latency=true to see this)
    netSamples: 0,

    requests: 1,

    txs: {},

    rawTxs: {},

    notifications: {},

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
        returns = returns.toLowerCase();
        if (result && result !== "0x") {
            if (returns && returns.slice(-2) === "[]") {
                result = this.unmarshal(result, returns);
            } else if (returns === "string") {
                result = abi.decode_hex(result, true);
            } else if (returns === "number") {
                result = abi.string(result);
            } else if (returns === "bignumber") {
                result = abi.bignum(result);
            } else if (returns === "unfix") {
                result = abi.unfix(result, "string");
            }
        }
        return result;
    },

    parse: function (response, returns, callback) {
        var results, len, err;
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
                    if (!callback) return response;
                    callback(response);
                } else if (response.result !== undefined) {
                    if (typeof response.result !== "boolean") {
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
                    }
                    if (!callback) return response.result;
                    callback(response.result);
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
                        } else if (response[i].result !== undefined) {
                            if (typeof response[i].result !== "boolean") {
                                if (returns[i]) {
                                    results[i] = this.applyReturns(returns[i], response[i].result);
                                } else {
                                    results[i] = abi.remove_leading_zeros(results[i]);
                                    results[i] = abi.prefix_hex(results[i]);
                                }
                            }
                        }
                    }
                    if (!isFunction(callback)) return results;
                    callback(results);

                // no result or error field
                } else {
                    err = errors.NO_RESPONSE;
                    err.bubble = response;
                    if (isFunction(callback)) return callback(err);
                    throw new this.Error(err);
                }
            }
        } catch (e) {
            err = e;
            if (e && e.name === "SyntaxError") {
                err = errors.INVALID_RESPONSE;
            }
            if (isFunction(callback)) return callback(err);
            throw new this.Error(err);
        }
    },

    strip: function (tx) {
        var returns;
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

    exciseNode: function (err, deadNode, callback) {
        if (deadNode && !this.nodes.local && !this.ipcpath) {
            if (this.debug.logs) {
                console.warn("[ethrpc] request to", deadNode, "failed:", err);
            }
            var deadIndex = this.nodes.hosted.indexOf(deadNode);
            if (deadIndex > -1) {
                this.nodes.hosted.splice(deadIndex, 1);
                if (!this.nodes.hosted.length) {
                    if (isFunction(callback)) {
                        return callback(errors.HOSTED_NODE_FAILURE);
                    }
                    throw new this.Error(errors.HOSTED_NODE_FAILURE);
                }
            }
            if (isFunction(callback)) callback();
        }
    },

    postSync: function (rpcUrl, command, returns) {
        var self = this;
        var timeout, req = null;
        if (command.timeout) {
            timeout = command.timeout;
            delete command.timeout;
        } else {
            timeout = this.POST_TIMEOUT;
        }
        if (NODE_JS) {
            req = syncRequest('POST', rpcUrl, {json: command, timeout: timeout});
            var response = req.getBody().toString();
            return this.parse(response, returns);
        }
        console.warn("[ethrpc] synchronous RPC request to", rpcUrl, command);
        if (window.XMLHttpRequest) {
            req = new window.XMLHttpRequest();
        } else {
            req = new window.ActiveXObject("Microsoft.XMLHTTP");
        }
        req.open("POST", rpcUrl, false);
        req.setRequestHeader("Content-type", "application/json");
        req.timeout = timeout;
        req.ontimeout = function () {
            console.error("[ethrpc] synchronous RPC timed out", rpcUrl, command.method);
            self.primaryNode = null;
        };
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
                    if (self.nodes.local === self.localnode) {
                        self.nodes.local = null;
                    }
                    e = errors.LOCAL_NODE_FAILURE;
                    e.bubble = err;
                    e.command = command;
                    return callback(e);
                } else if (self.excision) {
                    return self.exciseNode(err.code, rpcUrl, callback);
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

    // random primary node selection, weighted by (normalized)
    // inverse mean network latency
    selectPrimaryNode: function (nodes) {
        var select, rand, numNodes, total, weights, cdf, high, low;
        rand = Math.random();
        numNodes = nodes.length;
        weights = new Array(numNodes);
        for (var k = 0; k < numNodes; ++k) {
            weights[k] = 1 / this.latency[nodes[k]];
        }
        cdf = new Array(numNodes);
        total = 0;
        for (k = 0; k < numNodes; ++k) {
            total += weights[k];
            cdf[k] = total;
        }
        for (k = 0; k < numNodes; ++k) {
            cdf[k] /= total;
        }
        high = numNodes - 1;
        low = 0;
        while (low < high) {
            select = Math.ceil((high + low) / 2);
            if (cdf[select] < rand) {
                low = select + 1;
            } else if (cdf[select] > rand) {
                high = select - 1;
            } else {
                return nodes[select];
            }
        }
        if (low != high) {
            select = (cdf[low] >= rand) ? low : select;
        } else {
            select = (cdf[low] >= rand) ? low : low + 1;
        }
        console.debug("[ethrpc] primary node:", nodes[select]);
        return [nodes[select]].concat(nodes);
    },

    selectNodes: function () {
        if (this.nodes.local) return [this.nodes.local];
        if (!this.balancer || this.nodes.hosted.length === 1) {
            return this.nodes.hosted.slice();
        }

        // rotate nodes until we have enough samples to weight them
        if (!this.samples[HOSTED_NODES[0]] ||
            this.samples[HOSTED_NODES[0]] < this.BALANCER_SAMPLES) {
            this.nodes.hosted.unshift(this.nodes.hosted.pop());
            return this.nodes.hosted.slice();

        // if we have sufficient data, select a primary node
        } else {
            if (this.primaryNode === null) {
                this.primaryNode = this.selectPrimaryNode(this.nodes.hosted);
            }
            return this.primaryNode;
        }
    },

    // update the active node's mean network latency
    updateMeanLatency: function (node, latency) {
        if (!this.samples[node]) {
            this.samples[node] = 1;
            this.latency[node] = latency;
        } else {
            ++this.samples[node];
            this.latency[node] = (
                (this.samples[node] - 1)*this.latency[node] + latency
            ) / this.samples[node];
        }
        if (this.debug.latency) {
            if (this.netLatency === null) {
                this.netSamples = 1;
                this.netLatency = latency;
            } else {
                ++this.netSamples;
                this.netLatency = (
                    (this.netSamples - 1)*this.netLatency + latency
                ) / this.netSamples;
                if (this.debug.logs) {
                    console.log(
                        "[" + this.netSamples.toString() + "] mean network latency:",
                        this.netLatency
                    );
                }
            }
        }
    },

    contracts: function (network) {
        return contracts[network || this.version()];
    },

    // Post JSON-RPC command to all Ethereum nodes
    broadcast: function (command, callback) {
        var start, nodes, numCommands, returns, result, completed, self = this;

        if (!command || (command.constructor === Object && !command.method) ||
            (command.constructor === Array && !command.length))
        {
            if (!callback) return null;
            return callback(null);
        }
        if (this.debug.logs) {
            if (command.method === "eth_call" || command.method === "eth_sendTransaction") {
                if (command.params && (!command.params.length || !command.params[0].from)) {
                    console.log(
                        "**************************\n"+
                        "* OH GOD WHAT DID YOU DO *\n"+
                        "**************************"
                    );
                    var network = this.version();
                    var contracts = this.contracts(network);
                    var contract;
                    for (var address in contracts) {
                        if (!contracts.hasOwnProperty(address)) continue;
                        if (contracts[address] === command.params[0].to) {
                            contract = address;
                            break;
                        }
                    }
                    console.log(
                        "network:", network, "\n"+
                        "contract:", contract, "[" + command.params[0].to + "]\n"+
                        "method:", command.method, "\n"+
                        "params:", JSON.stringify(command.params, null, 2)
                    );
                    if (command.debug) {
                        console.log("tx:", JSON.stringify(command.debug, null, 2));
                        delete command.debug;
                    }
                }
            }
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
        if (NODE_JS && this.ipcpath && command.method &&
            command.method.indexOf("Filter") === -1)
        {
            var loopback = this.nodes.local && (
                (this.nodes.local.indexOf("127.0.0.1") > -1 ||
                this.nodes.local.indexOf("localhost") > -1)
            );
            if (!isFunction(callback) && !loopback) {
                throw new this.Error(errors.LOOPBACK_NOT_FOUND);
            }
            if (isFunction(callback) && command.constructor !== Array) {
                var received = '';
                var socket = new net.Socket();
                socket.setEncoding("utf8");
                socket.connect({ path: this.ipcpath }, function () {
                    socket.write(JSON.stringify(command));
                });
                socket.on("data", function (data) {
                    received += data;
                    self.parse(received, returns, function (parsed) {
                        if (parsed && parsed.error === 409) return;
                        socket.destroy();
                        callback(parsed);
                    });
                });
                socket.on("error", function (err) {
                    socket.destroy();
                    callback(err);
                });
                return;
            }
        }

        // make sure the ethereum node list isn't empty
        if (!this.nodes.local && !this.nodes.hosted.length && !this.ipcpath) {
            if (isFunction(callback)) return callback(errors.ETHEREUM_NOT_FOUND);
            throw new this.Error(errors.ETHEREUM_NOT_FOUND);
        }

        // select local / hosted node(s) to receive RPC
        nodes = this.selectNodes();

        // asynchronous request if callback exists
        if (isFunction(callback)) {
            async.eachSeries(nodes, function (node, nextNode) {
                if (!completed) {
                    if (self.debug.logs) {
                        console.log("nodes:", JSON.stringify(nodes));
                        console.log("post", command.method, "to:", node);
                    }
                    if (self.balancer) {
                        start = new Date().getTime();
                    }
                    self.post(node, command, returns, function (res) {
                        if (self.debug.logs) {
                            if (res && res.constructor === BigNumber) {
                                console.log(node, "response:", abi.string(res));
                            } else {
                                console.log(node, "response:", res);
                            }
                        }
                        if (node === nodes[nodes.length - 1] ||
                            (res !== undefined && res !== null &&
                            !res.error && res !== "0x"))
                        {
                            completed = true;
                            if (self.balancer) {
                                self.updateMeanLatency(node, new Date().getTime() - start);
                            }
                            return nextNode({ output: res });
                        }
                        nextNode();
                    });
                }
            }, function (res) {
                if (!res && res.output === undefined) return callback();
                callback(res.output);
            });

        // use synchronous http if no callback provided
        } else {
            for (var j = 0, len = nodes.length; j < len; ++j) {
                try {
                    if (this.debug.logs) {
                        console.log("nodes:", JSON.stringify(nodes));
                        console.log("synchronous post", command.method, "to:", nodes[j]);
                    }
                    if (this.balancer) {
                        start = new Date().getTime();
                    }
                    result = this.postSync(nodes[j], command, returns);
                    if (this.balancer) {
                        this.updateMeanLatency(nodes[j], new Date().getTime() - start);
                    }
                } catch (e) {
                    if (this.nodes.local) {
                        throw new this.Error(errors.LOCAL_NODE_FAILURE);
                    } else if (this.excision) {
                        this.exciseNode(e, nodes[j]);
                    }
                }
                if (result) return result;
            }
            throw new this.Error(errors.NO_RESPONSE);
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
            if (params.constructor === Object) {
                if (this.debug.broadcast && params.debug) {
                    payload.debug = abi.copy(params.debug);
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

    useHostedNode: function (urlstr) {
        this.nodes.local = null;
        if (urlstr) this.nodes.hosted = [urlstr];
    },

    // delete cached network, notification, and transaction data
    clear: function () {
        this.latency = {};
        this.samples = {};
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
        if (block && block.constructor === Function) {
            f = block;
            block = null;
        }
        block = block || "latest";
        return this.broadcast(this.marshal("getBalance", [address, block]), f);
    },
    getBalance: function (address, block, f) {
        if (block && block.constructor === Function) {
            f = block;
            block = null;
        }
        block = block || "latest";
        return this.broadcast(this.marshal("getBalance", [address, block]), f);
    },

    txCount: function (address, f) {
        return this.broadcast(this.marshal("getTransactionCount", address), f);
    },
    getTransactionCount: function (address, f) {
        return this.broadcast(this.marshal("getTransactionCount", address), f);
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
            invocation: {invoke: this.sendTx, context: this},
            value: abi.bignum(value).mul(this.ETHER).toFixed(),
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
                this.sign(account, "1010101", function (res) {
                    if (res) {
                        if (res.error) return f(false);
                        return f(true);
                    }
                    f(false);
                });
            } else {
                var res = this.sign(account, "1010101");
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
    invoke: function (itx, f) {
        var tx, dataAbi, packaged, invocation, invoked, err;
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
                                    tx.params[i] = abi.hex(tx.params[i]);
                                }
                            }
                        } else if (tx.params.constructor === BigNumber) {
                            tx.params = [abi.hex(tx.params)];
                        } else {
                            tx.params = [tx.params];
                        }
                    }
                    if (tx.to) tx.to = abi.prefix_hex(tx.to);
                    if (tx.from) tx.from = abi.prefix_hex(tx.from);
                    dataAbi = abi.encode(tx);
                    if (dataAbi) {
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
                        if (this.debug.broadcast) {
                            packaged.debug = abi.copy(tx);
                            packaged.debug.batch = false;
                        }
                        invocation = (tx.send) ? this.sendTx : this.call;
                        invoked = true;
                        return invocation.call(this, packaged, f);
                    }
                }
            }
        } catch (exc) {
            err = abi.copy(errors.TRANSACTION_FAILED);
            err.bubble = exc;
            err.tx = itx;
            if (isFunction(f)) return f(err);
            return err;
        }
        if (!invoked) {
            err = abi.copy(errors.TRANSACTION_FAILED);
            err.bubble = "!invoked";
            err.tx = itx;
            if (isFunction(f)) return f(err);
            return err;
        }
    },

    /**
     * Batched RPC commands
     */
    batch: function (txlist, f) {
        var numCommands, rpclist, callbacks, tx, dataAbi, packaged, invocation;
        if (txlist.constructor !== Array) {
            if (this.debug.logs) {
                console.warn("expected array for batch RPC, invoking instead");
            }
            return this.invoke(txlist, f);
        }
        numCommands = txlist.length;
        rpclist = new Array(numCommands);
        callbacks = new Array(numCommands);
        for (var i = 0; i < numCommands; ++i) {
            tx = abi.copy(txlist[i]);
            if (tx.params !== undefined) {
                if (tx.params.constructor === Array) {
                    for (var j = 0, len = tx.params.length; j < len; ++j) {
                        if (tx.params[j] !== undefined &&
                            tx.params[j] !== null &&
                            tx.params[j].constructor === BigNumber) {
                            tx.params[j] = abi.hex(tx.params[j]);
                        }
                    }
                } else if (tx.params.constructor === BigNumber) {
                    tx.params = abi.hex(tx.params);
                }
            }
            if (tx.from) tx.from = abi.prefix_hex(tx.from);
            tx.to = abi.prefix_hex(tx.to);
            dataAbi = abi.encode(tx);
            if (dataAbi) {
                if (tx.callback && tx.callback.constructor === Function) {
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
                if (this.debug.broadcast) {
                    packaged.debug = abi.copy(tx);
                    packaged.debug.batch = true;
                }
                invocation = (tx.send) ? "sendTransaction" : "call";
                rpclist[i] = this.marshal(invocation, packaged);
            } else {
                console.error("unable to package commands for batch RPC");
                return rpclist;
            }
        }
        if (!f) return this.broadcast(rpclist, f);

        // callback on whole array
        if (isFunction(f)) return this.broadcast(rpclist, f);

        // callback on each element
        this.broadcast(rpclist, function (res) {
            if (!res) return console.error(errors.TRANSACTION_FAILED);
            if (res.constructor === Array && res.length) {
                for (j = 0; j < numCommands; ++j) {
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

    encodeResult: function (result, returns) {
        if (result) {
            if (returns === "null") {
                result = null;
            } else if (returns === "address" || returns === "address[]") {
                result = abi.format_address(result);
            } else {
                if (!returns || returns === "hash[]" || returns === "hash") {
                    result = abi.hex(result);
                } else if (returns === "number") {
                    result = abi.string(result);
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
                            responseNumber = abi.string(responseNumber);
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
        var self = this;
        var tx = abi.copy(itx);
        if (!isFunction(callback)) {
            var res = this.errorCodes(tx, this.invoke(tx));
            if (res) {
                if (res.error) return res;
                return this.encodeResult(res, itx.returns);
            }
            throw new this.Error(errors.NO_RESPONSE);
        }
        this.invoke(tx, function (res) {
            res = self.errorCodes(tx, res);
            if (res) {
                if (res.error) return callback(res);
                return callback(self.encodeResult(res, itx.returns));
            }
            callback(errors.NO_RESPONSE);
        });
    },

    /***************************************
     * Send-call-confirm callback sequence *
     ***************************************/

    checkBlockHash: function (tx, callreturn, itx, txhash, returns, onSent, onSuccess, onFailed) {
        if (!this.txs[txhash]) this.txs[txhash] = {};
        if (this.txs[txhash].count === undefined) this.txs[txhash].count = 0;
        ++this.txs[txhash].count;
        if (this.debug.tx) console.debug("checkBlockHash:", tx, callreturn, itx);
        if (tx && tx.blockHash && abi.number(tx.blockHash) !== 0) {
            tx.callReturn = this.encodeResult(callreturn, returns);
            tx.txHash = tx.hash;
            delete tx.hash;
            this.txs[txhash].status = "confirmed";
            clearTimeout(this.notifications[txhash]);
            delete this.notifications[txhash];
            if (isFunction(onSuccess)) onSuccess(tx);
        } else {
            var self = this;
            if (this.txs[txhash].count < this.TX_POLL_MAX) {
                this.notifications[txhash] = setTimeout(function () {
                    if (self.txs[txhash].status === "pending") {
                        self.txNotify(callreturn, itx, txhash, returns, onSent, onSuccess, onFailed);
                    }
                }, this.TX_POLL_INTERVAL);
            } else {
                self.txs[txhash].status = "unconfirmed";
                if (isFunction(onFailed)) onFailed(errors.TRANSACTION_NOT_CONFIRMED);
            }
        }
    },

    txNotify: function (callreturn, itx, txhash, returns, onSent, onSuccess, onFailed) {
        var self = this;
        this.getTx(txhash, function (tx) {
            if (self.debug.tx) console.debug("txNofity.getTx:", tx);
            if (tx) {
                return self.checkBlockHash(tx, callreturn, itx, txhash, returns, onSent, onSuccess, onFailed);
            }
            self.txs[txhash].status = "failed";
            if (self.debug.tx)
                console.log("raw transactions:", self.rawTxs);

            // resubmit if this is a raw transaction and has a duplicate nonce
            if (self.rawTxs[txhash] && self.rawTxs[txhash].tx) {
                var duplicateNonce;
                for (var hash in self.rawTxs) {
                    if (!self.rawTxs.hasOwnProperty(hash)) continue;
                    if (self.rawTxs[hash].tx.nonce === self.rawTxs[txhash].tx.nonce) {
                        duplicateNonce = true;
                        break;
                    }
                }
                if (duplicateNonce) {
                    if (returns) itx.returns = returns;
                    self.txs[txhash].status = "resubmitted";
                    return self.transact(itx, onSent, onSuccess, onFailed);
                } else {
                    if (isFunction(onFailed)) onFailed(errors.TRANSACTION_NOT_FOUND);
                }
            } else {
                if (isFunction(onFailed)) onFailed(errors.TRANSACTION_NOT_FOUND);
            }
        });
    },

    confirmTx: function (tx, txhash, returns, onSent, onSuccess, onFailed) {
        var self = this;
        if (tx && txhash) {
            if (errors[txhash]) {
                if (isFunction(onFailed)) onFailed({
                    error: txhash,
                    message: errors[txhash],
                    tx: tx
                });
            } else {
                if (this.txs[txhash]) {
                    if (isFunction(onFailed)) onFailed(errors.DUPLICATE_TRANSACTION);
                } else {
                    this.txs[txhash] = { hash: txhash, tx: tx, count: 0, status: "pending" };
                    this.txs[txhash].tx.returns = returns;
                    return this.getTx(txhash, function (sent) {
                        if (self.debug.tx) console.debug("sent:", sent);
                        if (returns !== "null") {
                            return self.call({
                                from: sent.from,
                                to: sent.to || tx.to,
                                value: sent.value || tx.value,
                                data: sent.input
                            }, function (callReturn) {
                                if (callReturn) {
                                    if (errors[callReturn]) {
                                        self.txs[txhash].status = "failed";
                                        if (isFunction(onFailed)) onFailed({
                                            error: callReturn,
                                            message: errors[callReturn],
                                            tx: tx
                                        });
                                    } else {
                                        callReturn = JSON.stringify({ result: callReturn });

                                        // transform callReturn to a number
                                        var numReturn = self.parse(callReturn, "number");

                                        // check if numReturn is an error object
                                        if (numReturn.constructor === Object && numReturn.error) {
                                            self.txs[txhash].status = "failed";
                                            if (isFunction(onFailed)) onFailed(numReturn);
                                        } else if (errors[numReturn]) {
                                            self.txs[txhash].status = "failed";
                                            if (isFunction(onFailed)) onFailed({
                                                error: numReturn,
                                                message: errors[numReturn],
                                                tx: tx
                                            });
                                        } else {
                                            try {

                                                // check if numReturn is an error code
                                                if (numReturn && numReturn.constructor === BigNumber) {
                                                    numReturn = numReturn.toFixed();
                                                }
                                                if (numReturn && errors[tx.method] && errors[tx.method][numReturn]) {
                                                    self.txs[txhash].status = "failed";
                                                    if (isFunction(onFailed)) onFailed({
                                                        error: numReturn,
                                                        message: errors[tx.method][numReturn],
                                                        tx: tx
                                                    });
                                                } else {

                                                    // no errors found, so transform to the requested
                                                    // return type, specified by "returns" parameter
                                                    callReturn = self.parse(callReturn, returns);
                                                    self.txs[txhash].callReturn = self.encodeResult(callReturn, returns);

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
                                                    if (isFunction(onSuccess)) {
                                                        self.txNotify(
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
                                                self.txs[txhash].status = "failed";
                                                if (isFunction(onFailed)) onFailed(e);
                                            }
                                        }
                                    }

                                // no return value for call
                                } else {
                                    self.txs[txhash].status = "failed";
                                    if (isFunction(onFailed)) onFailed(errors.NULL_CALL_RETURN);
                                }
                            });
                        }

                        // if returns type is null, skip the intermediate call
                        onSent({ txHash: txhash, callReturn: null });
                        if (isFunction(onSuccess)) {
                            self.txNotify(null, tx, txhash, returns, onSent, onSuccess, onFailed);
                        }
                    });
                }
            }
        }
    },

    transact: function (tx, onSent, onSuccess, onFailed) {
        var self = this;
        var returns = tx.returns;
        tx.send = true;
        delete tx.returns;
        if (!isFunction(onSent)) return this.invoke(tx);
        this.invoke(tx, function (txhash) {
            if (self.debug.tx) console.debug("txhash:", txhash);
            if (txhash) {
                if (txhash.error) {
                    if (isFunction(onFailed)) onFailed(txhash);
                } else {
                    txhash = abi.prefix_hex(abi.pad_left(abi.strip_0x(txhash)));
                    self.confirmTx(tx, txhash, returns, onSent, onSuccess, onFailed);
                }
            } else {
                if (isFunction(onFailed)) onFailed(errors.NULL_RESPONSE);
            }
        });
    }
};
