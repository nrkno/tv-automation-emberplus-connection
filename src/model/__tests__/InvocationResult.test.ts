import { isInvocationResult } from '../InvocationResult'
import { EmberTypedValue } from '../EmberTypedValue'
import { ParameterType } from '../Parameter'

describe('model/InvocationResult', () => {
	describe('isInvocationResult', () => {
		test('should return false for null', () => {
			const actual = isInvocationResult(null)

			expect(actual).toBe(false)
		})

		test('should return false for undefined', () => {
			const actual = isInvocationResult(undefined)

			expect(actual).toBe(false)
		})

		test('should return true for valid input (all properties)', () => {
			const valid = { id: 909, success: true, result: new Array<EmberTypedValue>(0) }

			const actual = isInvocationResult(valid)

			expect(actual).toBe(true)
		})

		test('should return true for valid input (id only)', () => {
			const valid = { id: 909 }

			const actual = isInvocationResult(valid)

			expect(actual).toBe(true)
		})

		test('should return true for valid input (id and success)', () => {
			const valid = { id: 909, success: true }

			const actual = isInvocationResult(valid)

			expect(actual).toBe(true)
		})

		test('should return true for valid input (id and result)', () => {
			const validValue: EmberTypedValue = { type: ParameterType.Boolean, value: true }
			const valid = { id: 909, result: [validValue] }

			const actual = isInvocationResult(valid)

			expect(actual).toBe(true)
		})

		test('should return false for input with no id', () => {
			const invalid = { success: true, result: new Array<EmberTypedValue>(0) }

			const actual = isInvocationResult(invalid)

			expect(actual).toBe(false)
		})

		test('should return false for input with invalid id value (wrong type)', () => {
			const invalid = { id: 'unique', success: true, result: new Array<EmberTypedValue>(0) }

			const actual = isInvocationResult(invalid)

			expect(actual).toBe(false)
		})

		test('should return false for input with invalid id type (null)', () => {
			const invalid = { id: null, success: true, result: new Array<EmberTypedValue>(0) }

			const actual = isInvocationResult(invalid)

			expect(actual).toBe(false)
		})

		test('should return false for input with invalid success value (wrong type)', () => {
			const invalid = { id: 909, success: 'true' }

			const actual = isInvocationResult(invalid)

			expect(actual).toBe(false)
		})

		test('should return false for input with invalid result value (wrong type)', () => {
			const invalid = { id: 909, result: 'pretty good' }

			const actual = isInvocationResult(invalid)

			expect(actual).toBe(false)
		})

		test('should return false for input with invalid result value (array contents illegal)', () => {
			const validValue: EmberTypedValue = { type: ParameterType.Boolean, value: true }
			const invalid = { id: 909, result: [validValue, 'invalid'] }

			const actual = isInvocationResult(invalid)

			expect(actual).toBe(false)
		})
	})
})
