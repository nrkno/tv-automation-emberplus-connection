import { InvocationResult, InvocationResultImpl } from '../../model/InvocationResult'
import {
	decode as decodeEmberTypedValue,
	encode as encodeEmberTypedValue
} from './EmberTypedValueCodec'

export { encode, decode }

const TYPENAME = 'InvocationResult'

function encode(data: InvocationResult): any {
	const success = typeof data.success === 'boolean' ? data.success : undefined
	const result = Array.isArray(data.result) ? data.result.map(encodeEmberTypedValue) : undefined

	return { _type: TYPENAME, id: data.id, success, result }
}

function decode(data: any): InvocationResult {
	const { id, success } = data
	const result = Array.isArray(data.result) ? data.result.map(decodeEmberTypedValue) : undefined

	return new InvocationResultImpl(id, success, result)
}
