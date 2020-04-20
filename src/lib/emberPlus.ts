/**
 *  Draft Ember+ Typescript interface.
 */

export interface Tree<T> {
	value: T
	parent?: Tree<T>
	children?: Array<Tree<T>>
	index: number
	// TODO: insert all the usual tree manipulation methods
}

export enum ElementType {
	Parameter = 'PARAMETER',
	Node = 'NODE',
	Command = 'COMMAND',
	Matrix = 'MATRIX',
	Function = 'FUNCTION',
	Template = 'TEMPLATE'
}

export interface EmberElement {
	type: ElementType
	number: number
}

export interface Qualified<T extends EmberElement> {
	value: Tree<T>
	path: string
	getRelativeOID(): RelativeOID<T>
}

export type EmberTreeNode = Tree<EmberElement>
export type RootElement = EmberTreeNode | Qualified<Parameter> | Qualified<Node> | Qualified<Matrix> | Qualified<Function> | Qualified<Template>
export type Root = Array<RootElement> | Array<StreamEntry> | InvocationResult

// number is either Integer64 or REAL
export type EmberValue = number | string | boolean | Buffer | null
export type MinMax = number | null
export type StringIntegerCollection = Map<string, number>

export interface RelativeOID<T extends EmberElement> {
	resolve(): Tree<T>
}

export interface Command extends EmberElement {
	type: ElementType.Command
}

export interface Subscribe extends Command {
	number: CommandType.Subscribe
}

export interface Unsubscribe extends Command {
	number: CommandType.Unsubscribe
}

export interface GetDirectory extends Command {
  number: CommandType.GetDirectory
	dirFieldMask?: FieldFlags
}

export interface Invoke extends Command {
	number: CommandType.Invoke
	invocation?: Invocation
}

export interface Node extends EmberElement {
	type: ElementType.Node
	identifier?: string
	description?: string
	isRoot?: boolean
	isOnline?: boolean
	schemaIdentifiers?: string
	templateReference: RelativeOID<Template>
}

export interface Matrix extends EmberElement {
	type: ElementType.Matrix
	targets?: Array<number> // Integer32
	sources?: Array<number> // Integer32
	connections?: Array<Connection> // Integer32
	identifier: string
	description?: string
	matrixType?: MatrixType
	addressingMode?: MatrixAddressingMode
	targetCount?: number // Integer32 - linear: matrix X size, nonlinear - number of targets
	sourceCount?: number // Integer32 - linear: matrix Y size, nonLinear - number of sources
	maximumTotalConnects?: number // Integer32 - nToN: max number of set connections
	maximumConnectsPerTarget?: number // Integer32 - max number of connects per target
	parametersLocation?: RelativeOID<Node> | number // absolute of index reference to parameters - details tbc
	gainParameterNumber?: number // Integer32 - nToN: number of connection gain parameter
	labels?: Array<Label>
	schemaIdentifiers?: string
	templateReference: RelativeOID<Template>
}

// TODO break down further by ParamterType?
export interface Parameter extends EmberElement {
	type: ElementType.Parameter
	paramterType: ParameterType
	identifier?: string
	description?: string
	value?: EmberValue
	maximum?: MinMax
	minimum?: MinMax
	access?: ParameterAccess
	format?: string
	enumeration?: string
	factor?: number // Integer32
	isOnline?: boolean
	formula?: string
	step?: number // Integer32
	default?: any
	streamIdentifier?: number // BER readInt
	enumMap?: StringIntegerCollection
	streamDescriptor?: StreamDescription
	schemaIdentifiers?: string
	templateReference: RelativeOID<Template>
}

export interface Function extends EmberElement {
	type: ElementType.Function
	identifier?: string
	description?: string
	args?: Array<FunctionArgument>
	result?: Array<FunctionArgument>
	templateReference?: RelativeOID<Template>
}

export interface Template extends EmberElement {
	type: ElementType.Template
	element?: Parameter | Node | Matrix | Function
	description?: string
}

export enum ParameterType {
	Null = 'NULL',
	Integer = 'INTEGER',
	Real = 'REAL',
	String = 'STRING',
	Boolean = 'BOOLEAN',
	Trigger = 'TRIGGER',
	Enum = 'ENUM',
	Octets = 'OCTETS'
}

export enum ParameterAccess {
	None = 'NONE',
	Read = 'READ',
	Write = 'WRITE',
	ReadWrite = 'READ_WRITE'
}

export enum StreamFormat {
	UInt8 = 'UInt8',
	UInt16BE = 'UInt16BE',
	UInt16LE = 'UInt16LE',
	UInt32BE = 'UInt32BE',
	UInt32LE = 'UInt32LE',
	UInt64BE = 'UInt64BE',
	UInt64LE = 'UInt64LE',
	Int8 = 'Int8',
	Int16BE = 'Int16BE',
	Int16LE = 'Int16LE',
	Int32BE = 'Int32BE',
	Int32LE = 'Int32LE',
	Int64BE = 'Int64BE',
	Int64LE = 'Int64LE',
	Float32BE = 'Float32BE',
	Float32LE = 'Float32LE',
	Float64BE = 'Float64BE',
	Float64LE = 'Float64LE'
}

export enum FieldFlags {
	Sparse = 'SPARSE',
	All = 'ALL',
	Default = 'DEFAULT',
	Identifier = 'IDENTIFIER',
	Description = 'DESCRIPTION',
	Tree = 'TREE',
	Value = 'VALUE',
	Connections = 'CONNECTIONS'
}

export enum CommandType {
	Subscribe = 30,
	Unsubscribe = 31,
	GetDirectory = 32,
	Invoke = 33
}

export enum MatrixType {
	OneToN = 'ONE_TO_N',
	OneToOne = 'ONE_TO_ONE',
	NToN = 'N_TO_N'
}

export enum MatrixAddressingMode {
	Linear = 'LINEAR',
	NonLinear = 'NON_LINEAR'
}

export enum ConnectionOperation {
	Absolute = 'ABSOLUTE', // default. sources contains absolute information
	Connect = 'CONNECT', // nToN only. sources contains sources to add to connection
	disconnect = 'DISCONNECT' // nToN only. sources contains sources to remove from connection
}

export enum ConnectionDisposition {
	Tally = 'TALLY',
	Modified = 'MODIFIED',
	Pending = 'PENDING',
	Locked = 'LOCKED'
}

export interface StreamDescription {
	format: StreamFormat
	offset: number // Integer32
}

export interface StreamEntry {
	identifier: number // Integer32
	value: EmberValue // not null
}

export interface FunctionArgument {
	type: ParameterType
	name: string
}

export interface Invocation {
	id?: number // BER readInt
	args: Array<EmberValue>
}

export interface InvocationResult {
	id: number
	success?: boolean
	result?: Array<EmberValue>
}

export interface Label {
	basePath: string // might be RelativeOID<?>
	description: string
}

export interface Connection {
	target: number // Integer32
	sources?: Array<number> // Integer32s
	operation?: ConnectionOperation
	disposition?: ConnectionDisposition
}

function berEncode(el: EmberTreeNode): Buffer { return Buffer.alloc(0) }

function berDecode(b: Buffer): EmberTreeNode { return null }

function isValid(el: EmberTreeNode): boolean { return false }

function toJSON(el: EmberTreeNode): Object { return null }

function fromJSON(json: Object): EmberTreeNode { return null }
