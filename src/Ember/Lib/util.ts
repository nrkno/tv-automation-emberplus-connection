import { QualifiedElement, NumberedTreeNode, RootElement } from '../../types/types'
import { EmberElement, ElementType } from '../../model/EmberElement'
import { Command } from '../../model/Command'
import { QualifiedElementImpl, NumberedTreeNodeImpl, TreeElement } from '../../model/Tree'

export function assertQualifiedEmberNode(
	node: RootElement
): Exclude<RootElement, NumberedTreeNode<EmberElement>> {
	if ('path' in node) {
		return node
	} else {
		return toQualifiedEmberNode(node)
	}
}

export function getPath(node: RootElement): string {
	function isQualified(node: TreeElement<EmberElement>): node is QualifiedElement<EmberElement> {
		return 'path' in node
	}
	function isNumbered(node: TreeElement<EmberElement>): node is NumberedTreeNode<EmberElement> {
		return 'number' in node
	}
	if (isQualified(node)) {
		return node.path
	} else if (isNumbered(node)) {
		if (node.parent) {
			return getPath(node.parent) + '.' + node.number
		} else {
			return node.number + ''
		}
	}

	return ''
}

export function toQualifiedEmberNode(
	EmberNode: NumberedTreeNode<EmberElement>
): Exclude<RootElement, NumberedTreeNode<EmberElement>> {
	const path = getPath(EmberNode)

	if (EmberNode.contents.type === ElementType.Command) {
		throw new Error('Cannot convert a command to a qualified node')
	}

	return new QualifiedElementImpl<EmberElement>(
		path,
		EmberNode.contents,
		EmberNode.children // TODO - do we want the children?
	) as Exclude<RootElement, NumberedTreeNode<EmberElement>>
}

export function insertCommand(
	node: Exclude<RootElement, NumberedTreeNode<EmberElement>>,
	command: Command
): Exclude<RootElement, NumberedTreeNode<EmberElement>> {
	return new QualifiedElementImpl<EmberElement>(node.path, node.contents, [
		new NumberedTreeNodeImpl(0, command)
	]) as Exclude<RootElement, NumberedTreeNode<EmberElement>>
}

export function updateProps<T>(oldProps: T, newProps: T, props?: Array<keyof T>) {
	if (!props) props = Object.keys(newProps) as Array<keyof T>

	for (const key of props) {
		if (newProps[key] !== undefined && newProps[key] !== oldProps[key]) {
			oldProps[key] = newProps[key]
		}
	}
}
