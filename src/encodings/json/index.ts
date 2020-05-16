import { Root, RootType } from '../../types/types'
import { InvocationResultImpl } from '../../model/InvocationResult'

export { decode, encode }

function decode(obj: any): Root {
	const { _type } = obj

	switch (_type) {
		case RootType.Elements:
			return []
		case RootType.Streams:
			return []
		case RootType.InvocationResult:
			return new InvocationResultImpl(obj.id)
		default:
			throw new Error(`Unknown or missing root type: ${_type}`)
	}
}

function encode(el: Root, rootType: RootType): any {
	el
	return { _type: rootType }
}
