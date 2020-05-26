import * as Ber from '../../../Ber'
import { FunctionArgument } from '../../../model/FunctionArgument'
import { encodeFunctionArgument } from '../encoder/FunctionArgument'
import { decodeFunctionArgument } from '../decoder/FunctionArgument'
import { ParameterType } from '../../../model/Parameter'
import { literal } from '../../../types/types'
import { guarded } from '../decoder/DecodeResult'

describe('encoders/ber/FunctionArgument', () => {
	const fa = literal<FunctionArgument>({
		type: ParameterType.String,
		name: 'fred'
	})

	test('write and read function argument', () => {
		const writer = new Ber.Writer()
		encodeFunctionArgument(fa, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeFunctionArgument(reader))

		expect(decoded).toEqual(fa)
	})

	test('write and read function argument', () => {
		const noName = literal<FunctionArgument>({
			type: ParameterType.Boolean
		})
		const writer = new Ber.Writer()
		encodeFunctionArgument(noName, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeFunctionArgument(reader))

		expect(decoded).toEqual(noName)
	})
})
