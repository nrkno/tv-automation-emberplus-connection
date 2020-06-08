import { EmberTypedValue, isEmberTypedValue } from '../../../model/EmberTypedValue'
import { ParameterType } from '../../../model/Parameter'
import { decode, encode } from '../EmberTypedValueCodec'
import { decode as decodeEmberValue, encode as encodeEmberValue } from '../EmberValueCodec'

describe('encodings/JSON/EmberTypedValueCodec', () => {
	describe('decode', () => {
		test('shold return EmberTypedValue object with equal type and decoded value', () => {
			const input = { type: ParameterType.String, value: encodeEmberValue('juba juba') }
			const expectedType = input.type
			const expectedValue = decodeEmberValue(input.value)

			const actual = decode(input)

			expect(isEmberTypedValue(actual)).toBe(true)
			expect(actual.type).toBe(expectedType)
			expect(actual.value).toStrictEqual(expectedValue)
		})
	})

	describe('encode', () => {
		test('should return equal type and encoded value', () => {
			const input: EmberTypedValue = { type: ParameterType.Integer, value: 137 }
			const expectedType = input.type
			const expectedValue = encodeEmberValue(input.value)

			const actual = encode(input)

			expect(actual.type).toBe(expectedType)
			expect(actual.value).toStrictEqual(expectedValue)
		})
	})
})
