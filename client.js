const EventEmitter = require('events').EventEmitter;
const util = require('util');
const winston = require('winston');
const net = require('net');
const BER = require('./ber.js');
const ember = require('./ember.js');

const S101Codec = require('./s101.js');
const ConnectionState = {
    Disconnected: 0,
    Connecting: 1,
    Connected: 2
}

class S101Socket extends EventEmitter {
    constructor (addres, port, autoConnect = false, keepaliveInterval) {
        super()

        this.socket = undefined
        this.keepaliveInterval = 5000
        this.codec = new S101Codec()
        this.status = ConnectionState.Disconnected
    
        this._autoReconnect = true
        this._autoReconnectDelay = 5000
        this._connectionAttemptTimer = undefined
        this._reconnectAttempt = 0
        this._reconnectAttempts = 60

        this._shouldBeConnected = false
        this._sentKeepalive = 1
        this._receivedKeepalive = 0
    
        this.addres = addres
        this.port = port

        this.keepaliveInterval = keepaliveInterval || 5000
        if (this.autoConnect) this.connect()

        this.keepaliveTimer = setInterval(() => {
            if (this.isConnected()) {
                if (this._sentKeepalive > this._receivedKeepalive) {
                    this.dispose()
                    this._shouldBeConnected = true
                    this._onClose()
                } else {
                    this._sentKeepalive = Date.now()
                    this._sendKeepaliveRequest()
                }
            }
        }, this.keepaliveInterval)

        this.codec.on('keepaliveResp', () => {
            this._receivedKeepalive = Date.now()
        })

        this.codec.on('emberPacket', (packet) => {
            this.emit('emberPacket', packet)

            const ber = new BER.Reader(packet)
            try {
                const root = ember.Root.decode(ber)
                if (root !== undefined) {
                    this.emit('emberTree', root)
                }
            } catch (e) {
                winston.log(e)
            }
        })
    }

    connect () {
        // prevents manipulation of active socket
        if (this.status !== ConnectionState.Connected) {
            // throthling attempts
            if (!this._lastConnectionAttempt || (Date.now() - this._lastConnectionAttempt) >= this._autoReconnectDelay) { // !_lastReconnectionAttempt means first attempt, OR > _reconnectionDelay since last attempt
                // recereates client if new attempt
                if (this.socket && this.socket.connecting) {
                    this.socket.destroy()
                    this.socket.removeAllListeners()
                    delete this.socket
                    // @todo: fire event telling it gives up!
                }

                // (re)creates client, either on first run or new attempt
                if (!this.socket) {
                    this.socket = new net.Socket()
                    this.socket.on('close', (hadError) => this._onClose(hadError))
                    this.socket.on('connect', () => this._onConnect())
                    this.socket.on('data', (data) => this.codec.dataIn(data))
                    this.socket.on('error', (error) => this._onError(error))
                }

                // connects
                winston.log('Socket attempting connection')
                this.status = ConnectionState.Connecting
                this.socket.connect(this.port, this.addres)
                this._shouldBeConnected = true
                this._lastConnectionAttempt = Date.now()
            }

            // sets timer to retry when needed
            if (!this._connectionAttemptTimer) {
                this._connectionAttemptTimer = setInterval(() => this._autoReconnectionAttempt(), this._autoReconnectDelay)
            }
        }
    }

    disconnect () {
        this.dispose()
    }

    dispose () {
        this._shouldBeConnected = false
        this._clearConnectionAttemptTimer()
        if (this.socket) {
            this.socket.destroy()
            delete this.socket
        }
    }

    isConnected () {
        return this.status === ConnectionState.Connected
    }
    
    _sendKeepaliveRequest () {
        var self = this;
        if (self.isConnected()) {
            this.lastKeepAliveSent = Date.now()
            self.socket.write(self.codec.keepAliveRequest());
            winston.debug('sent keepalive request');
        }
    }

    _sendKeepaliveResponse () {
        var self = this;
        if (self.isConnected()) {
            this.lastKeepAliveResponse = Date.now()
            self.socket.write(self.codec.keepAliveResponse());
            winston.debug('sent keepalive response');
        }
    }

    _sendBER () {
        var self = this;
        if (self.isConnected()) {
            var frames = self.codec.encodeBER(data);
            for (var i = 0; i < frames.length; i++) {
                self.socket.write(frames[i]);
            }
        }
    }

    _sendBERNode () {
        var self=this;
        if (!node) return;
        var writer = new BER.Writer();
        node.encode(writer);
        self.sendBER(writer.buffer);
    }

    _autoReconnectionAttempt () {
        if (this._autoReconnect) {
            if (this._reconnectAttempts > 0) {								// no reconnection if no valid reconnectionAttemps is set
                if ((this._reconnectAttempt >= this._reconnectAttempts)) {	// if current attempt is not less than max attempts
                    // reset reconnection behaviour
                    this._clearConnectionAttemptTimer()
                    this.status = ConnectionState.Disconnected
                    return
                }
                // new attempt if not allready connected
                if (!this.isConnected()) {
                    this._reconnectAttempt++
                    this.connect()
                }
            }
        }
    }

    _clearConnectionAttemptTimer () {
		// @todo create event telling reconnection ended with result: true/false
		// only if reconnection interval is true
        this._reconnectAttempt = 0
        clearInterval(this._connectionAttemptTimer)
        delete this._connectionAttemptTimer
    }

    _onConnect () {
        this._clearConnectionAttemptTimer()
        this._sentKeepalive = Date.now()
        this._receivedKeepalive = this._sentKeepalive + 1 // for some reason keepalive doesn't return directly after conn.
        this.status = ConnectionState.Connected
        this.emit('connected')
    }

    _onError (error) {
        winston.error(error) // @todo...
    }

    _onClose (hadError) {
        this.emit('disconnected', 'Unknown Error')
        this.status = ConnectionState.Disconnected
        if (hadError) {
            winston.log('Socket closed with error')
        } else {
            winston.log('Socket closed without error')
        }
        if (this._shouldBeConnected === true) {
            winston.log('Socket should reconnect')
            this.emit('connecting')
            this.connect()
        }
    }
}

class S101Client extends EventEmitter {
    constructor (socket, server) {
        var self = this;
        S101Client.super_.call(this);

        self.server = server;
        self.socket = socket;

        self.pendingRequests = [];
        self.activeRequest = null;

        self.status = "connected";

        self.codec.on('keepaliveReq', () => {
            self.sendKeepaliveResponse();
        });

        self.codec.on('emberPacket', (packet) => {
            self.emit('emberPacket', packet);

            var ber = new BER.Reader(packet);
            try {
                var root = ember.Root.decode(ber);
                if (root !== undefined) {
                    self.emit('emberTree', root);
                }
            } catch(e) {
                self.emit("error", e);
            }
        });

        if (socket !== undefined) {
            self.socket.on('data', (data) => {
                self.codec.dataIn(data);
            });

            self.socket.on('close', () => {
                self.emit('disconnected');
                self.status = "disconnected";
                self.socket = null;
            });

            self.socket.on('error', (e) => {
                self.emit("error", e);
            });
        }
    }

    remoteAddress () {
        if (this.socket === undefined) {
            return;
        }
        return `${this.socket.remoteAddress}:${this.socket.remotePort}`
    }

    queueMessage (node) {    
        const self = this;
        this.addRequest(() => {
            self.sendBERNode(node);
        });
    }

    makeRequest () {
        if(this.activeRequest === null && this.pendingRequests.length > 0) {
            this.activeRequest = this.pendingRequests.shift();
            this.activeRequest();
            this.activeRequest = null;
        }
    }

    addRequest (cb) {
        this.pendingRequests.push(cb);
        this.makeRequest();
    }
}

class S101Server extends EventEmitter { 
    constructor (address, port) {
        var self = this;
        S101Server.super_.call(this);

        self.address = address;
        self.port = port;
        self.server = null;
        self.status = "disconnected";
    }

    listen () {
        var self = this;
        if (self.status !== "disconnected") {
            return;
        }
        
        self.server = net.createServer((socket) => {
            self.addClient(socket);
        });
       
        self.server.on("error", (e) => {
            self.emit("error", e);
        });
    
        self.server.on("listening", () => {
            self.emit("listening");
            self.status = "listening";
        });
     
        self.server.listen(self.port, self.address);
    }

    addClient (socket) {
        var client = new S101Client(socket, this);
        this.emit("connection", client);
    }
}

module.exports = { S101Socket, S101Server, S101Client };
