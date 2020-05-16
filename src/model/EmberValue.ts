export { EmberValue, isEmberValue }

// number is either Integer64 or REAL
type EmberValue = number | string | boolean | Buffer | null

/**
 * Type predicate for EmberValue.
 *
 * @param value object to be tested for type compliance
 *
 * @returns true if compliant, false if not
 */
function isEmberValue(value: any): value is EmberValue {
	if (value === null) {
		return true
	}

	if (value instanceof Buffer) {
		return true
	}

	const validTypes = ['number', 'string', 'boolean']
	if (validTypes.indexOf(typeof value) > -1) {
		return true
	}

	return false
}
