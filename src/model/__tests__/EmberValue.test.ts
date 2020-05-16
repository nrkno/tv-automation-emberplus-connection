import { isEmberValue } from '../EmberValue'

describe('model/EmberValue', () => {
	describe('isEmberValue', () => {
		test('should return false for undefined', () => {
			const actual = isEmberValue(undefined)

			expect(actual).toBe(false)
		})

		test('should return true for null', () => {
			const actual = isEmberValue(null)

			expect(actual).toBe(true)
		})

		test('should return true for a string', () => {
			const actual = isEmberValue('this is valid')

			expect(actual).toBe(true)
		})

		test('should return true for an empty string', () => {
			const actual = isEmberValue('')

			expect(actual).toBe(true)
		})

		test('should return true for a positive number', () => {
			const actual = isEmberValue(1)

			expect(actual).toBe(true)
		})

		test('should return true for a negative number', () => {
			const actual = isEmberValue(-136867687.256)

			expect(actual).toBe(true)
		})

		test('should return true for 0', () => {
			const actual = isEmberValue(0)

			expect(actual).toBe(true)
		})

		test('should return true for true', () => {
			const actual = isEmberValue(true)

			expect(actual).toBe(true)
		})

		test('should return true for false', () => {
			const actual = isEmberValue(false)

			expect(actual).toBe(true)
		})

		test('should return true for a Buffer', () => {
			const actual = isEmberValue(new Buffer(0))

			expect(actual).toBe(true)
		})
	})
})
