import { EmberTreeNode, EmberValue, Function, Invocation, InvocationResult, ParameterType, Parameter, Matrix, ConnectionOperation, RootElement, Qualified, EmberElement, Command, GetDirectory, CommandType, FieldFlags, ElementType, Subscribe, Tree, Unsubscribe, Invoke } from './lib/emberPlus'
import { ResponseResolver } from './resolvers';
import { EventEmitter } from 'events'

export type RequestPromise<T> = Promise<{
  sentOk: boolean
  reqId?: string
  cancel?: () => void
  response?: Promise<T>
}>

export interface IRequest {
  reqId: string
  node: Qualified<EmberElement>
  resolve: (res: any) => void
  reject: (err: Error) => void
}

export interface ConnectionStatus {
  Error,
  Disconnected,
  Connecting,
  Connected
}

export interface IEmberClient {
  tree: EmberTreeNode
  isConnected: boolean
  requests: Map<string, ResponseResolver> // reqId => resolver

  constructor: (host: string, port: number) => void

  connect: (host?: string, port?: number) => Promise<void>
  disconnect: () => Promise<void>

  /**
   * Ember+ native commands:
   */
  getDirectory: (node: RootElement) => RequestPromise<RootElement>
  subscribe: (node: EmberTreeNode, cb?: (node: EmberTreeNode) => void) => RequestPromise<void>
  unsubscribe: (node: EmberTreeNode) => RequestPromise<void>

  /**
   * Send parts of tree to provider for setting stuff:
   */
  setValue: (node: EmberTreeNode, value: EmberValue) => RequestPromise<EmberTreeNode>
  invokeFunction: (func: Function, args: Invocation['args']) => RequestPromise<InvocationResult>
  matrixConnect: (matrix: Matrix, targetId: number, sources: Array<number>) => Promise<Matrix>
  matrixDisconnect: (matrix: Matrix, targetId: number, sources: Array<number>) => Promise<Matrix>
  matrixSetConnection: (matrix: Matrix, targetId: number, sources: Array<number>) => Promise<Matrix>

  /**
   * Helpful functions for the tree:
   */
  expand: (node: EmberTreeNode) => RequestPromise<EmberTreeNode> // TODO - is this the correct input / output?
  /**
   * Attempts find an element in the tree. Optional callback to be called
   * everytime there is an update for this node
   * 
   * TODO - should this attempt to find the node locally first and do
   * getDirectory for missing nodes or just send a qualified node with a
   * getDirectory?
   */
  getElementByPath: (path: string, cb?: (node: EmberTreeNode) => void) => RequestPromise<EmberTreeNode>
}

export class EmberClient extends EventEmitter implements IEmberClient {
  host: string
  port: number

  private _requests = new Map<string, IRequest>()
  private _lastInvocation = 0

  constructor (host?, port = 9000) {
    super()

    if (host) this.host = host
    this.port = port
  }

  /**
   * Opens an s101 socket to the provider.
   * TODO - implement
   * @param host The host of the emberplus provider
   * @param port Port of the provider
   */
  connect (host?, port?) {
    if (host) this.host = host
    if (port) this.port = port

    if (!this.host) return Promise.reject('No host specified')

    return Promise.resolve()
  }

  /**
   * Closes the s101 socket to the provider
   */
  disconnect () {
    return Promise.resolve()
  }

  /** Ember+ commands: */
  getDirectory (node: RootElement, dirFieldMask?: FieldFlags) {
    const command: GetDirectory = {
      type: ElementType.Command,
      number: CommandType.GetDirectory,
      dirFieldMask
    }
    return this._sendCommand<RootElement>(node, command)
  }
  subscribe (node: EmberTreeNode, cb?: (node: EmberTreeNode) => void) {
    const command: Subscribe = {
      type: ElementType.Command,
      number: CommandType.Subscribe
    }
    return this._sendCommand<void>(node, command, false)
  }
  unsubscribe (node: EmberTreeNode, cb?: (node: EmberTreeNode) => void) {
    const command: Unsubscribe = {
      type: ElementType.Command,
      number: CommandType.Unsubscribe
    }
    return this._sendCommand<void>(node, command, false)
  }
  invoke (node: EmberTreeNode, ...args: Array<EmberValue>) {
    const command: Invoke = {
      type: ElementType.Command,
      number: CommandType.Invoke,
      invocation: {
        id: ++this._lastInvocation,
        args
      }
    }
    return this._sendCommand<InvocationResult>(node, command, false)
  }

  private _sendCommand<T> (node: EmberTreeNode | RootElement, command: Command, hasResponse?: boolean) {
    // assert a qualified node
    const qualifiedNode = assertQualifiedNode(node)
    // insert command
    const commandNode = insertCommand(qualifiedNode, command)
    // send request
    return this._sendRequest<T>(commandNode, hasResponse)
  }

  private async _sendRequest<T> (node: Qualified<EmberElement>, hasResponse = true): RequestPromise<T> {
    const reqId = Math.random().toString(24).substr(-4)
    let resolve: IRequest['resolve']
    let reject: IRequest['reject']
    const promise = new Promise<T>((resolve, reject) => {
      resolve = resolve
      reject = reject
    })

    if (hasResponse) {
      const request: IRequest = {
        reqId,
        node,
        resolve,
        reject
      }
      this._requests.set(reqId, request)
    }

    const requestPromise = {
      reqId,
      sentOk: false,
      ...(hasResponse && {
        cancel: () => {
          reject(new Error('Request cancelled'))
          this._requests.delete(reqId)
        },
        promise
      })
    }

    const message = berEncode(node)
    await this._socket.sendMessage(message)

    return requestPromise
  } 
}

// TODO - move to utils
export function assertQualifiedNode (node: RootElement): Qualified<EmberElement> {
  if ((node as Qualified<EmberElement>).path) {
    return node as Qualified<EmberElement>
  } else {
    return toQualifiedNode(node as EmberTreeNode)
  }
}

// TODO - what to do with any children. Do they keep their object pointers / references?
export function toQualifiedNode (node: EmberTreeNode): Qualified<EmberElement> {
  const findPath = (node: EmberTreeNode) => {
    if (node.parent) {
      return findPath(node.parent) + '.' + node.index
    }
  }
  const path = findPath(node)

  // TODO - use actual class!
  return {
    value: {
      value: node.value,
      children: node.children, // TODO - do we want the children?
      index: 1
    },
    path
  }
}

export function insertCommand (node: Qualified<EmberElement>, command: Command): Qualified<EmberElement> {
  if (node.value.children) {
    // TODO - what does this mean? can we even insert a command?
  } else {
    node.value.children = [ {
      index: 1,
      value: command
    } ]
  }
  return node
}
