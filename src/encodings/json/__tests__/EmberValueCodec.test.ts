import { decode, encode } from '../EmberValueCodec'

describe('encodings/JSON/EmberValueCodec', () => {
	describe('decode', () => {
		test('should return number for number', () => {
			const input = { type: 'number', value: 13 }
			const expected = input.value

			const actual = decode(input)

			expect(typeof actual).toBe('number')
			expect(actual).toBe(expected)
		})

		test('should return string for string', () => {
			const input = { type: 'string', value: 'my life got flipped turned upside down' }
			const expected = input.value

			const actual = decode(input)

			expect(typeof actual).toBe('string')
			expect(actual).toBe(expected)
		})

		test('should return boolean for boolean', () => {
			const input = { type: 'boolean', value: true }
			const expected = input.value

			const actual = decode(input)

			expect(typeof actual).toBe('boolean')
			expect(actual).toBe(expected)
		})

		test('should return Buffer for Buffer', () => {
			const expected = Buffer.from([0x4f, 0x6c, 0x61])
			const encodedValue = expected.toJSON().data
			const input = { type: 'Buffer', value: encodedValue }

			const actual = decode(input)

			expect(actual instanceof Buffer).toBe(true)
			expect(actual).toStrictEqual(expected)
		})

		test('should return null for null', () => {
			const input = { type: 'object', value: null }

			const actual = decode(input)

			expect(actual).toBeNull()
		})
	})

	describe('encode', () => {
		test('should return number for number', () => {
			const expectedValue = 12

			const actual = encode(expectedValue)

			expect(actual.type).toBe('number')
			expect(actual.value).toBe(expectedValue)
		})

		test('should return string for string', () => {
			const expectedValue = 'this is a story all about how'

			const actual = encode(expectedValue)

			expect(actual.type).toBe('string')
			expect(actual.value).toBe(expectedValue)
		})

		test('should return boolean for boolean', () => {
			const expectedValue = false

			const actual = encode(expectedValue)

			expect(actual.type).toBe('boolean')
			expect(actual.value).toBe(expectedValue)
		})

		test('should return Buffer for Buffer', () => {
			const buffer = Buffer.from([0x4f, 0x6c, 0x61])
			const expectedValue = buffer.toJSON().data

			const actual = encode(buffer)

			expect(actual.type).toBe('Buffer')
			expect(actual.value).toStrictEqual(expectedValue)
		})

		test('should return null for null', () => {
			const expectedValue = null

			const actual = encode(expectedValue)

			expect(actual.type).toBe('object')
			expect(actual.value).toBe(expectedValue)
		})
	})
})
