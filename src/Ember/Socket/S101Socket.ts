import { EventEmitter } from 'events'
import { Socket } from 'net'

import { S101Codec } from '../../S101'
import { berDecode } from '../..'

export type Request = any

export default class S101Socket extends EventEmitter {
	socket: Socket | undefined
	keepaliveInterval = 10
	keepaliveIntervalTimer: NodeJS.Timer | undefined
	pendingRequests: Array<Request> = []
	activeRequest: Request | undefined
	status: string
	codec = new S101Codec()

	constructor(socket?: Socket) {
		super()
		this.socket = socket
		this.keepaliveIntervalTimer = undefined
		this.activeRequest = undefined
		this.status = this.isConnected() ? 'connected' : 'disconnected'

		this.codec.on('keepaliveReq', () => {
			this.sendKeepaliveResponse()
		})

		this.codec.on('emberPacket', (packet) => {
			this.emit('emberPacket', packet)
			try {
				const root = berDecode(packet)
				if (root != null) {
					this.emit('emberTree', root)
				}
			} catch (e) {
				this.emit('error', e)
			}
		})

		this._initSocket()
	}

	// Overide EventEmitter.on() for stronger typings:
	on: ((event: 'emberPacket', listener: (packet: Buffer) => void) => this) &
		((event: 'emberTree', listener: (root: any) => void) => this) &
		((event: 'error', listener: (error: Error) => void) => this) &
		((event: 'connecting', listener: () => void) => this) &
		((event: 'connected', listener: () => void) => this) &
		((event: 'disconnected', listener: () => void) => this) = super.on
	emit: ((event: 'emberPacket', packet: Buffer) => boolean) &
		((event: 'emberTree', root: any) => boolean) &
		((event: 'error', error: Error) => boolean) &
		((event: 'connecting') => boolean) &
		((event: 'connected') => boolean) &
		((event: 'disconnected') => boolean) = super.emit

	_initSocket() {
		if (this.socket != null) {
			this.socket.on('data', (data) => {
				this.codec.dataIn(data)
			})

			this.socket.on('close', () => {
				this.emit('disconnected')
				this.status = 'disconnected'
				this.socket?.removeAllListeners()
				this.socket = undefined
			})

			this.socket.on('error', (e) => {
				this.emit('error', e)
			})
		}
	}

	/**
	 * @returns {string} - ie: "10.1.1.1:9000"
	 */
	remoteAddress() {
		if (this.socket === undefined) {
			return 'not connected'
		}
		return `${this.socket.remoteAddress}:${this.socket.remotePort}`
	}

	/**
	 * @param {number} timeout=2
	 */
	disconnect(timeout = 2): Promise<void> {
		if (!this.isConnected() || this.socket === undefined) {
			return Promise.resolve()
		}
		return new Promise((resolve, reject) => {
			if (this.keepaliveIntervalTimer != null) {
				clearInterval(this.keepaliveIntervalTimer)
				this.keepaliveIntervalTimer = undefined
			}
			let done = false
			const cb = (_data: any, error: Error) => {
				if (done) {
					return
				}
				done = true
				if (timer !== undefined) {
					clearTimeout(timer)
					timer = undefined
				}
				if (error === undefined) {
					resolve()
				} else {
					reject(error)
				}
			}
			let timer: number | undefined
			if (timeout != null && !isNaN(timeout) && timeout > 0) {
				timer = setTimeout(cb, 100 * timeout)
			}
			this.socket!.end(cb)
			this.status = 'disconnected'
		})
	}

	/**
	 *
	 */
	handleClose() {
		this.socket = undefined
		if (this.keepaliveIntervalTimer) clearInterval(this.keepaliveIntervalTimer)
		this.status = 'disconnected'
		this.emit('disconnected')
	}

	isConnected(): boolean {
		return this.socket !== undefined && !!this.socket
	}

	async sendBER(data: Buffer) {
		if (this.isConnected()) {
			try {
				const frames = this.codec.encodeBER(data)
				for (let i = 0; i < frames.length; i++) {
					this.socket!.write(frames[i])
				}
				return true
			} catch (e) {
				this.handleClose()
				return false
			}
		} else {
			return false
		}
	}

	/**
	 *
	 */
	sendKeepaliveRequest() {
		if (this.isConnected()) {
			try {
				this.socket!.write(this.codec.keepAliveRequest())
			} catch (e) {
				this.handleClose()
			}
		}
	}

	/**
	 *
	 */
	sendKeepaliveResponse() {
		if (this.isConnected()) {
			try {
				this.socket!.write(this.codec.keepAliveResponse())
			} catch (e) {
				this.handleClose()
			}
		}
	}

	// sendBERNode(node: Root) {
	// 	if (!node) return
	// 	const ber = berEncode(node)
	// 	this.sendBER(ber)
	// }

	startKeepAlive() {
		this.keepaliveIntervalTimer = setInterval(() => {
			try {
				this.sendKeepaliveRequest()
			} catch (e) {
				this.emit('error', e)
			}
		}, 1000 * this.keepaliveInterval)
	}
}
