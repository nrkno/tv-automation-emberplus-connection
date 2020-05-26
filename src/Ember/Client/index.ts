import {
	EmberValue,
	RootElement,
	QualifiedElement,
	TreeElement,
	NumberedTreeNode,
	EmberTypedValue,
	RootType,
	Collection
} from '../../types/types'
import { InvocationResult } from '../../model/InvocationResult'
import { Matrix } from '../../model/Matrix'
import { EmberElement } from '../../model/EmberElement'
import { Command, GetDirectoryImpl, SubscribeImpl, UnsubscribeImpl } from '../../model/Command'
import { GetDirectory, CommandType, FieldFlags } from '../../model/Command'
import { ElementType } from '../../model/EmberElement'
import { Subscribe } from '../../model/Command'
import { Unsubscribe } from '../../model/Command'
import { Invoke } from '../../model/Command'
import { Parameter } from '../../model/Parameter'
import { Connection, ConnectionDisposition } from '../../model/Connection'
import { ConnectionOperation } from '../../model/Connection'
import { Root } from '../../types/types'
import { EmberNode } from '../../model/EmberNode'

import { EventEmitter } from 'events'
import { S101Client } from '../Socket'
import { getPath, assertQualifiedEmberNode, insertCommand, updateProps } from '../Lib/util'
import { berEncode } from '../..'
import { NumberedTreeNodeImpl } from '../../model/Tree'
import { EmberFunction } from '../../model/EmberFunction'
import { DecodeResult } from '../../encodings/ber/decoder/DecodeResult'

export type RequestPromise<T> = Promise<RequestPromiseArguments<T>>
export interface RequestPromiseArguments<T> {
	sentOk: boolean
	reqId?: string
	cancel?: () => void
	response?: Promise<T>
}

export interface Request {
	reqId: string
	node: RootElement
	resolve: (res: any) => void
	reject: (err: Error) => void
	cb?: (EmberNode: TreeElement<EmberElement>) => void
	message: Buffer
	firstSent: number
	lastSent: number
}

export interface Subscription {
	path: string | undefined // undefined implies root level
	cb: (EmberNode: TreeElement<EmberElement>) => void
}

export interface Change {
	path: string | undefined
	node: RootElement
}

export enum ConnectionStatus {
	Error,
	Disconnected,
	Connecting,
	Connected
}

export class EmberClient extends EventEmitter {
	host: string
	port: number
	tree: Collection<NumberedTreeNode<EmberElement>> = []

	private _requests = new Map<string, Request>()
	private _lastInvocation = 0
	private _client: S101Client
	private _subscriptions: Array<Subscription> = []

	private _timeout = 3000
	private _resendTimeout = 1000
	private _resends = false
	private _timer: NodeJS.Timer

	constructor(
		host: string,
		port = 9000,
		timeout = 3000,
		enableResends = false,
		resendTimeout = 1000
	) {
		super()

		this.host = host
		this.port = port
		this._timeout = timeout
		this._resendTimeout = resendTimeout
		this._resends = enableResends

		// resend timer runs at greatest common divisor of timeouts and resends
		const findGcd = (a: number, b: number) => {
			// assuming a and b are greater than 0
			while (b) {
				const t = b
				b = a % b
				a = t
			}
			return a
		}
		this._timer = setInterval(
			() => this._resendTimer(),
			findGcd(this._timeout, this._resendTimeout)
		)

		this._client = new S101Client(this.host, this.port)
		this._client.on('emberTree', (tree: DecodeResult<Root>) => this._handleIncoming(tree))

		this._client.on('connected', () => this.emit('connected'))
		this._client.on('disconnected', () => {
			this._requests.forEach((req) => {
				req.reject(new Error('Socket was disconnected'))
				this._requests.delete(req.reqId)
			})
			this.emit('disconnected')
		})
	}

	/**
	 * Opens an s101 socket to the provider.
	 * @param host The host of the emberplus provider
	 * @param port Port of the provider
	 */
	connect(host?: string, port?: number) {
		if (host) this.host = host
		if (port) this.port = port

		if (!this.host) return Promise.reject('No host specified')

		this._client.address = this.host
		this._client.port = this.port

		return this._client.connect()
	}

	/**
	 * Closes the s101 socket to the provider
	 */
	disconnect() {
		return this._client.disconnect()
	}

	/**
	 * Discards any outgoing connections, removes all requests and clears any timing loops
	 *
	 * This is destructive, using this class after discarding will cause errors.
	 */
	discard() {
		this.disconnect()
		delete this._client
		this._requests.forEach((req) => {
			req.reject(new Error('Socket was disconnected'))
			this._requests.delete(req.reqId)
		})
		clearInterval(this._timer)
	}

	get connected(): boolean {
		return this._client.isConnected()
	}

	/** Ember+ commands: */
	getDirectory(
		node: RootElement | Array<RootElement>,
		dirFieldMask?: FieldFlags,
		cb?: (EmberNode: TreeElement<EmberElement>) => void
	) {
		const command: GetDirectory = new GetDirectoryImpl(dirFieldMask)

		if (Array.isArray(node)) {
			if (cb)
				this._subscriptions.push({
					path: undefined,
					cb
				})

			return this._sendRequest<Root>(new NumberedTreeNodeImpl(0, command))
		}

		if (cb)
			this._subscriptions.push({
				path: getPath(node),
				cb
			})

		return this._sendCommand<RootElement>(node, command)
	}
	subscribe(
		node: RootElement | Array<RootElement>,
		cb?: (EmberNode: TreeElement<EmberElement>) => void
	) {
		const command: Subscribe = new SubscribeImpl()

		if (Array.isArray(node)) {
			if (cb)
				this._subscriptions.push({
					path: undefined,
					cb
				})

			return this._sendRequest<Root>(new NumberedTreeNodeImpl(0, command))
		}

		if (cb)
			this._subscriptions.push({
				path: getPath(node),
				cb
			})

		return this._sendCommand<void>(node, command, false)
	}
	unsubscribe(node: NumberedTreeNode<EmberElement> | Array<RootElement>) {
		const command: Unsubscribe = new UnsubscribeImpl()

		const path = Array.isArray(node) ? '' : getPath(node)
		for (const i in this._subscriptions) {
			if (this._subscriptions[i].path === path) {
				this._subscriptions.splice(Number(i), 1)
			}
		}

		if (Array.isArray(node)) {
			return this._sendRequest<Root>(new NumberedTreeNodeImpl(0, command))
		}

		return this._sendCommand<void>(node, command, false)
	}
	invoke(
		node: NumberedTreeNode<EmberFunction> | QualifiedElement<EmberFunction>,
		...args: Array<EmberTypedValue>
	) {
		// TODO - validate arguments
		const command: Invoke = {
			type: ElementType.Command,
			number: CommandType.Invoke,
			invocation: {
				id: ++this._lastInvocation,
				args
			}
		}
		return this._sendCommand<InvocationResult>(node, command)
	}

	/** Sending ember+ values */
	setValue(
		node: QualifiedElement<Parameter> | NumberedTreeNode<Parameter>,
		value: EmberValue,
		awaitResponse = true
	): RequestPromise<TreeElement<Parameter>> {
		const qualifiedParam = assertQualifiedEmberNode(node) as QualifiedElement<Parameter>

		// TODO - validate value
		// TODO - should other properties be scrapped?
		qualifiedParam.contents.value = value

		return this._sendRequest<TreeElement<Parameter>>(qualifiedParam, awaitResponse)
	}
	matrixConnect(
		matrix: QualifiedElement<Matrix> | NumberedTreeNode<Matrix>,
		target: number,
		sources: Array<number>
	): RequestPromise<TreeElement<Matrix>> {
		return this._matrixMutation(matrix, target, sources, ConnectionOperation.Connect)
	}
	matrixDisconnect(
		matrix: QualifiedElement<Matrix> | NumberedTreeNode<Matrix>,
		target: number,
		sources: Array<number>
	): RequestPromise<TreeElement<Matrix>> {
		return this._matrixMutation(matrix, target, sources, ConnectionOperation.Disconnect)
	}
	matrixSetConnection(
		matrix: QualifiedElement<Matrix> | NumberedTreeNode<Matrix>,
		target: number,
		sources: Array<number>
	): RequestPromise<TreeElement<Matrix>> {
		return this._matrixMutation(matrix, target, sources, ConnectionOperation.Absolute)
	}

	/** Getting the tree: */
	async expand(node: NumberedTreeNode<EmberElement> | Array<RootElement>) {
		if (Array.isArray(node)) {
			await (await this.getDirectory(node)).response
			for (const root of Object.values(this.tree)) await this.expand(root)
			return
		}

		const emberNodes = [node]
		const canBeExpanded = (node: NumberedTreeNode<EmberElement>) => {
			if (node.contents.type === ElementType.Node) {
				return (node as NumberedTreeNode<EmberNode>).contents.isOnline !== false
			} else {
				return (
					node.contents.type !== ElementType.Parameter &&
					node.contents.type !== ElementType.Function
				)
			}
		}

		let curEmberNode
		while ((curEmberNode = emberNodes.shift())) {
			if (curEmberNode.children) {
				emberNodes.push(...Object.values(curEmberNode.children).filter(canBeExpanded))
			} else {
				const req = await this.getDirectory(curEmberNode)
				if (!req.response) continue
				const res = (await req.response) as RootElement
				if (res.children) {
					Object.values(res.children).forEach((c) => canBeExpanded(c) && emberNodes.push(c))
				}
			}
		}
	}
	async getElementByPath(path: string, cb?: (EmberNode: TreeElement<EmberElement>) => void) {
		console.log('get ' + path)
		const getNext = (elements: Collection<NumberedTreeNode<EmberElement>>, i?: string) =>
			Object.values(elements || {}).find(
				(r) =>
					r.number === Number(i) ||
					(r.contents as EmberNode).identifier === i ||
					(r.contents as EmberNode).description === i
			)
		const getNextChild = (node: TreeElement<EmberElement>, i: string) =>
			node.children && getNext(node.children, i)

		const numberedPath: Array<number> = []
		const pathArr = path.split('.')
		const i = pathArr.shift()
		let tree: NumberedTreeNode<EmberElement> | undefined = getNext(this.tree, i)
		if (tree?.number) numberedPath.push(tree?.number)

		while (pathArr.length) {
			const i = pathArr.shift()
			if (!tree) throw new Error('Could not find node on given path')
			if (!i) continue
			let next = getNextChild(tree, i)
			if (!next) {
				const req = await this.getDirectory(tree)
				tree = (await req.response) as NumberedTreeNode<EmberElement>
				next = getNextChild(tree, i)
			}
			tree = next
			if (tree?.number) numberedPath.push(tree?.number)
		}

		if (cb && numberedPath) {
			console.log(numberedPath)
			this._subscriptions.push({
				path: numberedPath.join('.'),
				cb
			})
		}

		return tree
	}

	private _matrixMutation(
		matrix: QualifiedElement<Matrix> | NumberedTreeNode<Matrix>,
		target: number,
		sources: Array<number>,
		operation: ConnectionOperation
	) {
		const qualifiedMatrix = assertQualifiedEmberNode(matrix) as QualifiedElement<Matrix>

		const connection: Connection = {
			operation,
			target,
			sources
		}

		qualifiedMatrix.contents.connections = [connection]

		return this._sendRequest<TreeElement<Matrix>>(qualifiedMatrix)
	}

	private _sendCommand<T>(EmberNode: RootElement, command: Command, hasResponse?: boolean) {
		// assert a qualified EmberNode
		const qualifiedEmberNode = assertQualifiedEmberNode(EmberNode)
		// insert command
		const commandEmberNode = insertCommand(qualifiedEmberNode, command)
		// send request
		return this._sendRequest<T>(commandEmberNode, hasResponse)
	}

	private async _sendRequest<T>(node: RootElement, hasResponse = true): RequestPromise<T> {
		const reqId = Math.random().toString(24).substr(-4)
		const requestPromise: RequestPromiseArguments<T> = {
			reqId,
			sentOk: false
		}

		const message = berEncode([node], RootType.Elements)

		if (hasResponse) {
			const p = new Promise<T>((resolve, reject) => {
				const request: Request = {
					reqId,
					node,
					resolve,
					reject,
					message,
					firstSent: Date.now(),
					lastSent: Date.now()
				}
				this._requests.set(reqId, request)

				requestPromise.cancel = () => {
					reject(new Error('Request cancelled'))
					this._requests.delete(reqId)
				}
			})
			requestPromise.response = p
		}

		const sentOk = await this._client.sendBER(message) // TODO - if sending multiple values to same path, should we do synchronous requests?

		if (!sentOk && requestPromise.cancel) {
			this._requests.get(reqId)?.reject(new Error('Request was not sent correctly'))
			this._requests.delete(reqId)
		}

		return {
			...requestPromise,
			sentOk
		}
	}

	private _handleIncoming(incoming: DecodeResult<Root>) {
		const node = incoming.value
		// update tree:
		const changes = this._applyRootToTree(node)

		// check for subscriptiions:
		for (const change of changes) {
			const subscription = this._subscriptions.find((s) => s.path === change.path)
			if (subscription && change.node) subscription.cb(change.node)
		}

		// check for any outstanding requests and resolve them
		// iterate over requests, check path, if Invocation check id
		// resolve requests
		for (const change of changes) {
			const reqs = Array.from(this._requests.values()).filter(
				(s) =>
					(!('path' in s.node) && !change.path) || ('path' in s.node && s.node.path === change.path)
			)
			for (const req of reqs) {
				if (req.cb) req.cb(change.node)
				if (req.resolve) {
					req.resolve(change.node)
					this._requests.delete(req.reqId)
				}
			}
		}

		// at last, emit the errors for logging purposes
		incoming.errors?.forEach((e) => this.emit('warn', e))
	}

	private _applyRootToTree(node: Root): Array<Change> {
		let changes: Array<Change> = []

		if ('id' in node) {
			// node is an InvocationResult
			this._requests.forEach((req) => {
				if (req.node.contents.type === ElementType.Function) {
					if (req.node.children && req.node.children[0]) {
						if ('invocation' in (req.node.children[0].contents as Invoke)) {
							if (
								(req.node.children[0].contents as Invoke).invocation?.id &&
								(req.node.children[0].contents as Invoke).invocation?.id === node.id
							) {
								req.resolve(node)
								this._requests.delete(req.reqId)
							}
						}
					}
				}
			})
		} else {
			// EmberNode is not an InvocationResult

			// walk tree
			for (const rootElement of Object.values(node as Collection<RootElement>)) {
				if ('identifier' in rootElement) {
					// rootElement is a StreamEntry
					continue
				} else if ('path' in rootElement) {
					// element is qualified
					const path: Array<string> = rootElement.path.split('.')
					let tree = this.tree[Number(path.shift())]
					let inserted = false

					if (!tree) {
						if (path.length) {
							// Assuming this means that no get directory was done on the root of the tree.
							changes = [...changes, { path: rootElement.path, node: rootElement }]
							continue
						} else {
							const number = Number(rootElement.path)
							// Insert node into root
							this.tree[number] = new NumberedTreeNodeImpl(
								number,
								rootElement.contents,
								rootElement.children
							)
							changes = [...changes, { path: undefined, node: this.tree[number] }]
							continue
						}
					}

					for (const number of path) {
						if (!tree.children) tree.children = []
						if (!tree.children[Number(number)]) {
							tree.children[Number(number)] = {
								...rootElement,
								number: Number(number),
								parent: tree
							}
							changes = [
								...changes,
								{
									path: rootElement.path.substr(0, rootElement.path.length - 2),
									node: tree
								}
							]
							inserted = true
							break
						}
						tree = tree.children![Number(number)]
					}

					if (inserted) continue
					changes = [...changes, ...this._updateTree(rootElement, tree)]
				} else {
					if (this.tree[rootElement.number]) {
						changes = [
							...changes,
							...this._updateTree(
								rootElement as NumberedTreeNode<EmberElement>,
								this.tree[(rootElement as NumberedTreeNode<EmberElement>).number]
							)
						]
					} else {
						this.tree[rootElement.number] = rootElement
						changes = [...changes, { path: undefined, node: rootElement }]
					}
				}
			}
		}

		return changes
	}

	private _updateTree(
		update: TreeElement<EmberElement>,
		tree: NumberedTreeNode<EmberElement>
	): Array<Change> {
		let changes: Array<Change> = []

		if (update.contents.type === tree.contents.type) {
			changes.push({ path: getPath(tree), node: tree })
			switch (tree.contents.type) {
				case ElementType.Node:
					this._updateEmberNode(update.contents as EmberNode, tree.contents as EmberNode)
					break
				case ElementType.Parameter:
					this._updateParameter(update.contents as Parameter, tree.contents as Parameter)
					break
				case ElementType.Matrix:
					this._updateMatrix(update.contents as Matrix, tree.contents as Matrix)
					break
			}
		}
		if (update.children && tree.children) {
			// Update children
			for (const child of Object.values(update.children)) {
				const i = child.number
				const oldChild = tree.children[i]
				changes = {
					...changes,
					...this._updateTree(child, oldChild)
				}
			}
		} else if (update.children) {
			changes.push({ path: getPath(tree), node: tree })
			tree.children = update.children
		}

		return changes
	}

	private _updateEmberNode(update: EmberNode, EmberNode: EmberNode) {
		updateProps<EmberNode>(EmberNode, update, ['isOnline'])
	}

	private _updateParameter(update: Parameter, parameter: Parameter) {
		updateProps<Parameter>(parameter, update, ['value', 'isOnline', 'access'])
	}

	private _updateMatrix(update: Matrix, matrix: Matrix) {
		updateProps<Matrix>(matrix, update, [
			'targets',
			'targetCount',
			'sources',
			'sourceCount',
			'connections'
		])

		// update connections
		if (update.connections) {
			if (matrix.connections) {
				// matrix already has connections
				for (const connection of Object.values(update.connections)) {
					if (
						!connection.disposition ||
						!(
							connection.disposition === ConnectionDisposition.Locked ||
							connection.disposition === ConnectionDisposition.Pending
						)
					) {
						// update is either generic, tally or modification
						let exists = false
						for (const i in matrix.connections) {
							if (matrix.connections[i].target === connection.target) {
								// found connection to update
								exists = true
								matrix.connections[i].sources = connection.sources
							}
						}

						if (!exists) {
							// connection to target does not exist yet
							matrix.connections[connection.target] = {
								target: connection.target,
								sources: connection.sources
							}
						}
					}
				}
			} else {
				// connections have not been set yet
				matrix.connections = update.connections
			}
		}
	}

	private _resendTimer() {
		if (this.connected) {
			this._requests.forEach((req) => {
				const sinceSent = Date.now() - req.lastSent
				const sinceFirstSent = Date.now() - req.firstSent
				if (this._resends && sinceSent >= this._resendTimeout) {
					this._client.sendBER(req.message)
					req.lastSent = Date.now()
				}
				if (sinceFirstSent >= this._timeout) {
					req.reject(new Error('Request timed out'))
					this._requests.delete(req.reqId)
				}
			})
		}
	}
}
