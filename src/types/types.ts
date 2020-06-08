import { EmberElement } from '../model/EmberElement'
import { EmberFunction } from '../model/EmberFunction'
import { Parameter } from '../model/Parameter'
import { Template } from '../model/Template'
import { Matrix } from '../model/Matrix'
import { EmberNode } from '../model/EmberNode'
import { StreamEntry } from '../model/StreamEntry'
import { InvocationResult } from '../model/InvocationResult'
import { TreeElement, NumberedTreeNode, QualifiedElement } from '../model/Tree'

export {
	TreeElement,
	NumberedTreeNode,
	QualifiedElement,
	EmberTreeNode,
	Root,
	RootElement,
	RootType,
	MinMax,
	StringIntegerCollection,
	RelativeOID,
	literal,
	Collection
}

type EmberTreeNode<T extends EmberElement> = NumberedTreeNode<T>
type RootElement =
	| NumberedTreeNode<EmberElement>
	| QualifiedElement<Parameter>
	| QualifiedElement<EmberNode>
	| QualifiedElement<Matrix>
	| QualifiedElement<EmberFunction>
	| QualifiedElement<Template>
type Root = Collection<RootElement> | Collection<StreamEntry> | InvocationResult

enum RootType {
	Elements,
	Streams,
	InvocationResult
}

type MinMax = number | null
type StringIntegerCollection = Map<string, number>
type RelativeOID = string

function literal<T>(arg: T): T {
	return arg
}

type Collection<T> = { [index: number]: T }
