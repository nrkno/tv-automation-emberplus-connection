import { ParameterType } from './Parameter'
import { EmberValue, isEmberValue } from './EmberValue'

export { EmberTypedValue, isEmberTypedValue }

interface EmberTypedValue {
	type: ParameterType
	value: EmberValue
}

/**
 * Type predicate for {@link EmberTypedValue}.
 *
 * Note that this only checks for type compliance, and not for logical errors.
 * This means that for example having a number value for a string type or other
 * similar mismatches will not return false.
 *
 * @param obj the object to check for compliance
 * @returns true if compliant, false if not
 */
function isEmberTypedValue(obj: any): obj is EmberTypedValue {
	if (obj === undefined || obj === null) {
		return false
	}

	if (Object.values(ParameterType).indexOf(obj.type) < 0) {
		return false
	}

	if (!isEmberValue(obj.value)) {
		return false
	}

	return true
}
