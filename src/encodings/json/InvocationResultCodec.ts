import { InvocationResult, InvocationResultImpl } from '../../model/InvocationResult'

export { encode, decode }

const TYPENAME = 'InvocationResult'

function encode(data: InvocationResult): any {
	const success = typeof data.success === 'boolean' ? data.success : undefined
	const result = Array.isArray(data.result) ? data.result : undefined

	return { _type: TYPENAME, id: data.id, success, result }
}

function decode(data: any): InvocationResult {
	const { id, success } = data

	return new InvocationResultImpl(id, success)
}
