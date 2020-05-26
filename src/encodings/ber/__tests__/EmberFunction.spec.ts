import * as Ber from '../../../Ber'
import { EmberFunction, EmberFunctionImpl } from '../../../model/EmberFunction'
import { encodeFunction } from '../encoder/EmberFunction'
import { decodeFunctionContent } from '../decoder/EmberFunction'
import { FunctionArgumentImpl } from '../../../model/FunctionArgument'
import { ParameterType } from '../../../model/Parameter'
import { guarded } from '../decoder/DecodeResult'

describe('encodings/ber/EmberFunction', () => {
	describe('roundtrips', () => {
		function testFunction(fn: EmberFunction): void {
			const writer = new Ber.Writer()
			encodeFunction(fn, writer)
			console.log(writer.buffer)
			const reader = new Ber.Reader(writer.buffer)
			const decoded = guarded(decodeFunctionContent(reader))

			expect(decoded).toEqual(fn)
		}

		test('identifier', () => {
			const fn = new EmberFunctionImpl('identifier')
			testFunction(fn)
		})

		test('description', () => {
			const fn = new EmberFunctionImpl()
			fn.description = 'Description of many words'
			testFunction(fn)
		})

		test('args', () => {
			const fn = new EmberFunctionImpl('identifier')
			fn.args = [new FunctionArgumentImpl(ParameterType.Integer, 'Arg')]
			testFunction(fn)
		})

		test('result', () => {
			const fn = new EmberFunctionImpl('identifier')
			fn.result = [new FunctionArgumentImpl(ParameterType.Integer, 'Result')]
			testFunction(fn)
		})

		test('templateReference', () => {
			const fn = new EmberFunctionImpl('identifier')
			fn.templateReference = '1.2.3'
			testFunction(fn)
		})
	})
})
