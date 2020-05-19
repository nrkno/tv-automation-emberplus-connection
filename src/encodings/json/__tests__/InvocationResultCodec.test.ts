import { InvocationResultImpl } from '../../../model/InvocationResult'
import { encode, decode } from '../InvocationResultCodec'
import { ParameterType } from '../../../model/Parameter'

describe('encodings/json/InvocationResultCodec', () => {
	describe('decode', () => {
		test('should set id from id property', () => {
			const expected = 47

			const actual = decode({ id: expected })

			expect(actual.id).toBe(expected)
		})

		test('should set success from input property (true)', () => {
			const expected = true

			const actual = decode({ id: 1, success: expected })

			expect(actual.success).toBe(expected)
		})

		test('should set success from input property (false)', () => {
			const expected = false

			const actual = decode({ id: 1, success: expected })

			expect(actual.success).toBe(expected)
		})

		test('should not set success if not present in input', () => {
			const actual = decode({ id: 1 })

			expect(actual.success).toBeUndefined()
		})
	})

	describe('encode', () => {
		test('should set _type to InvocationResult', () => {
			const expected = 'InvocationResult'

			const actual = encode(new InvocationResultImpl(2))

			expect(actual._type).toBe(expected)
		})

		test('should copy id property', () => {
			const expected = 520

			const actual = encode(new InvocationResultImpl(expected))

			expect(actual.id).toBe(expected)
		})

		test('should copy success property (true)', () => {
			const expected = true

			const actual = encode(new InvocationResultImpl(1, expected))

			expect(actual.success).toBe(expected)
		})

		test('should copy success property (false)', () => {
			const expected = false

			const actual = encode(new InvocationResultImpl(1, expected))

			expect(actual.success).toBe(expected)
		})

		test('should not set success property if input has no value for it', () => {
			const actual = encode(new InvocationResultImpl(1))

			expect(actual.success).toBeUndefined()
		})

		test('should not set result if input has no value for it', () => {
			const actual = encode(new InvocationResultImpl(1))

			expect(actual.result).toBeUndefined()
		})

		test('should set result to array if set in input', () => {
			const actual = encode(
				new InvocationResultImpl(1, true, [{ type: ParameterType.Boolean, value: true }])
			)

			expect(Array.isArray(actual.result)).toBe(true)
		})

		test('should encode result values', () => {
			fail('not implemented yet')
		})
	})
})
