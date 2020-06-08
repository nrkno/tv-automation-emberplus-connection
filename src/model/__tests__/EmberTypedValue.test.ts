import { isEmberTypedValue } from '../EmberTypedValue'
import { ParameterType } from '../Parameter'

describe('model/EmberTypedValue', () => {
	describe('isEmberTypedValue', () => {
		test('should return false for undefined', () => {
			const actual = isEmberTypedValue(undefined)

			expect(actual).toBe(false)
		})

		test('should return false for null', () => {
			const actual = isEmberTypedValue(null)

			expect(actual).toBe(false)
		})

		test('should return false when missing type', () => {
			const invalid = {
				value: true
			}

			const actual = isEmberTypedValue(invalid)

			expect(actual).toBe(false)
		})

		test('should return false when type is invalid', () => {
			const invalid = {
				type: ';aseriovm;siern;sionrv',
				value: true
			}

			const actual = isEmberTypedValue(invalid)

			expect(actual).toBe(false)
		})

		test('should return false when missing value', () => {
			const invalid = {
				type: ParameterType.Integer
			}

			const actual = isEmberTypedValue(invalid)

			expect(actual).toBe(false)
		})

		test('should return false when value is invalid', () => {
			const invalid = {
				type: ParameterType.Integer,
				value: new Array(0)
			}

			const actual = isEmberTypedValue(invalid)

			expect(actual).toBe(false)
		})

		test('should return true for valid EmberTypedValue (Boolean type)', () => {
			const valid = {
				type: ParameterType.Boolean,
				value: true
			}

			const actual = isEmberTypedValue(valid)

			expect(actual).toBe(true)
		})
	})
})
