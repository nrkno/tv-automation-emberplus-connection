import net from 'net'
import S101Socket from './S101Socket'

const DEFAULT_PORT = 9000

export default class S101Client extends S101Socket {
	address: string
	port: number

	/**
	 *
	 * @param {string} address
	 * @param {number} port=9000
	 */
	constructor(address: string, port = DEFAULT_PORT) {
		super()
		this.address = address
		this.port = port
	}

	connect(timeout = 2): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.status !== 'disconnected') {
				resolve() // Already connected (is it the right address though?)
				return
			}
			this.emit('connecting')
			const connectTimeoutListener = () => {
				if (this.socket) this.socket.destroy()
				const reason = new Error(
					`Could not connect to ${this.address}:${this.port} after a timeout of ${timeout} seconds`
				)
				reject(reason)
			}

			const timer = setTimeout(() => connectTimeoutListener, timeout * 1000)
			this.socket = net.createConnection(
				{
					port: this.port,
					host: this.address
				},
				() => {
					clearTimeout(timer)
					if (this.socket) this.socket.setTimeout(0)
					this.startKeepAlive()
					this.emit('connected')
					resolve()
				}
			)
			this._initSocket()
		})
	}
}
