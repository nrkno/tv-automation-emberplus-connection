import { EmberTypedValue, isEmberTypedValue } from '../model/EmberTypedValue'

export { InvocationResult, InvocationResultImpl, isInvocationResult }

/**
 *  Result of a function invocation, sent from provider to consumer.
 */
interface InvocationResult {
	/** Matches the invocation identifier */
	id: number
	/** True if no errors were encountered when executing the function. */
	success?: boolean
	/** Return value of the function call, matching the expected result tyoes. */
	result?: Array<EmberTypedValue>
}

class InvocationResultImpl implements InvocationResult {
	constructor(
		public id: number,
		public success?: boolean,
		public result?: Array<EmberTypedValue>
	) {}
}

/**
 * Type predicate for {@link InvocationResult} interface
 *
 * Note that this will only check type compliance, not logical errors.
 *
 * @param obj object to test for type compliance
 * @returns true if compliant, false if not
 */
function isInvocationResult(obj: any): obj is InvocationResult {
	if (obj === undefined || obj === null) {
		return false
	}

	const { id, success, result } = obj as InvocationResult

	if (!id || typeof id !== 'number') {
		return false
	}

	if (success && typeof success !== 'boolean') {
		return false
	}

	if (result) {
		if (!Array.isArray(result)) {
			return false
		}

		if (result.length !== result.filter(isEmberTypedValue).length) {
			return false
		}
	}

	return true
}
