import {
  EmberTreeNode,
  EmberValue,
  Function,
  Invocation,
  InvocationResult,
  Matrix,
  RootElement,
  Qualified,
  EmberElement,
  Command,
  GetDirectory,
  CommandType,
  FieldFlags,
  ElementType,
  Subscribe,
  Unsubscribe,
  Invoke,
  Parameter,
  Tree,
  ParameterType,
  Connection,
  ConnectionOperation,
  Root
} from './lib/emberPlus'
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
  invokeFunction: (func: Function, args: Invocation['args']) => RequestPromise<InvocationResult>

  /**
   * Send parts of tree to provider for setting stuff:
   */
  setValue: (node: Tree<Parameter>, value: EmberValue) => RequestPromise<Tree<Parameter>>
  matrixConnect: (matrix: Tree<Matrix>, targetId: number, sources: Array<number>) => RequestPromise<Tree<Matrix>>
  matrixDisconnect: (matrix: Tree<Matrix>, targetId: number, sources: Array<number>) => RequestPromise<Tree<Matrix>>
  matrixSetConnection: (matrix: Tree<Matrix>, targetId: number, sources: Array<number>) => RequestPromise<Tree<Matrix>>

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
  private _tree: Root // TODO - why not public?

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
  getDirectory (node: RootElement, dirFieldMask?: FieldFlags,  cb?: (node: EmberTreeNode) => void) {
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
  unsubscribe (node: EmberTreeNode) {
    const command: Unsubscribe = {
      type: ElementType.Command,
      number: CommandType.Unsubscribe
    }
    return this._sendCommand<void>(node, command, false)
  }
  invoke (node: EmberTreeNode, ...args: Array<EmberValue>) {
    // TODO - validate arguments
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

  /** Sending ember+ values */
  setValue (node: Tree<Parameter>, value: EmberValue): RequestPromise<Tree<Parameter>> {
    const qualifiedParam = assertQualifiedNode(node) as Qualified<Parameter>

    // TODO - validate value
    // TODO - should other properties be scrapped?
    qualifiedParam.value.value.value = value

    return this._sendRequest<Tree<Parameter>>(qualifiedParam)
  }
  matrixConnect (matrix: Tree<Matrix>, target: number, sources: Array<number>): RequestPromise<Tree<Matrix>> {
    return this._matrixMutation(matrix, target, sources, ConnectionOperation.Connect)
  }
  matrixDisconnect (matrix: Tree<Matrix>, target: number, sources: Array<number>): RequestPromise<Tree<Matrix>> {
    return this._matrixMutation(matrix, target, sources, ConnectionOperation.Disconnect)
  }
  matrixSetConnection (matrix: Tree<Matrix>, target: number, sources: Array<number>): RequestPromise<Tree<Matrix>> {
    return this._matrixMutation(matrix, target, sources, ConnectionOperation.Absolute)
  }

  /** Getting the tree: */
  // TODO - these functions don't necessarilly send a request, should they really
  // return a RequestPromise?
  expand (node: EmberTreeNode): RequestPromise<EmberTreeNode> {
    const nodes = [ node ]
    const p: Array<Promise<any>> = []

    let curNode
    while (curNode = nodes.shift()) {
      if (curNode.children) {
        nodes.push(...curNode.children)
      } else {
        p.push(this.getDirectory(curNode).then(async req => {
          if (req.response) {
            const res = await req.response as Tree<EmberElement>
            return res.children?.map(c => this.expand(c))
          }
        }))
      }
    }

    return Promise.all(p).then(() => ({
      sentOk: true,
      response: Promise.resolve(node)
    }), () => ({
      sentOk: false
    }))
  }
  async getElementByPath (path: string, cb?: (node: EmberTreeNode) => void): RequestPromise<EmberTreeNode> {
    const pathArr = path.split('.') // TODO - should we remain backward compatible and accept "/"?
    let tree: EmberTreeNode = this._tree[pathArr.shift()]

    for (let i = pathArr.shift(); pathArr.length; i = pathArr.shift()) {
      if (tree.children && tree.children[i]) {
        tree = tree.children[i]
      } else {
        const req = await this.getDirectory(tree)
        tree = await req.response as EmberTreeNode
        if (tree.children && tree.children[i]) {
          tree = tree.children[i]
        } else {
          throw new Error('Child not found')
        }
      }
    }

    return {
      sentOk: true,
      response: Promise.resolve(tree)
    }
  }

  private _matrixMutation (matrix: Tree<Matrix>, target: number, sources: Array<number>, operation: ConnectionOperation) {
    const qualifiedMatrix = assertQualifiedNode(matrix) as Qualified<Matrix>

    const connection: Connection = {
      operation,
      target,
      sources
    }

    qualifiedMatrix.value.value.connections = [ connection ]

    return this._sendRequest<Tree<Matrix>>(qualifiedMatrix)
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
