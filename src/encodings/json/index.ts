import { Root, RootType } from '../../types/types'
import { InvocationResult } from '../../model/InvocationResult'

import {
	decode as decodeInvocationResult,
	encode as encodeInvocationResult
} from './InvocationResultCodec'

export { decode, encode }

function decode(obj: any): Root {
	const { _rootType } = obj

	switch (_rootType) {
		case RootType.Elements:
			return []
		case RootType.Streams:
			return []
		case RootType.InvocationResult:
			return decodeInvocationResult(obj)
		default:
			throw new Error(`Unknown or missing root type: ${_rootType}`)
	}
}

function encode(el: Root, rootType: RootType): any {
	switch (rootType) {
		case RootType.InvocationResult:
			return Object.assign(encodeInvocationResult(el as InvocationResult), { _rootType: rootType })
		default:
			return { _rootType: rootType }
	}
}
