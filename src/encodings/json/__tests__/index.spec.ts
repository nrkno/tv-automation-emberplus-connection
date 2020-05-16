import { decode, encode } from '../index'
import { Root, RootType } from '../../../types/types'
import { InvocationResultImpl, isInvocationResult } from '../../../model/InvocationResult'
import { ParameterType } from '../../../model/Parameter'
import { QualifiedElementImpl, NumberedTreeNodeImpl } from '../../../model/Tree'
import { EmberNodeImpl } from '../../../model/EmberNode'

describe('encoders/JSON', () => {
	describe('encode', () => {
		test('should set root _type property to RootType value', () => {
			const root = new InvocationResultImpl(42)

			const actual = encode(root, RootType.InvocationResult)

			expect(actual._type).toEqual(RootType.InvocationResult)
		})
	})

	describe('decode', () => {
		test('should return array when _type equals RootType.Elements', () => {
			const input = {
				_type: RootType.Elements
			}

			const actual = decode(input)

			expect(Array.isArray(actual)).toBe(true)
		})

		test('should return array when _type equals RootType.Streams', () => {
			const input = {
				_type: RootType.Streams
			}

			const actual = decode(input)

			expect(Array.isArray(actual)).toBe(true)
		})

		test('should return InvocationResult when _type equals RootType.InvocationResult', () => {
			const input = {
				_type: RootType.InvocationResult,
				id: 47
			}

			const actual = decode(input)

			expect(isInvocationResult(actual)).toBe(true)
		})
	})

	describe.skip('Roundtrip tests', () => {
		function roundTrip(res: Root, type: RootType): void {
			const encoded = encode(res, type)
			const decoded = decode(encoded)

			expect(decoded).toEqual(res)
		}

		test('InvocationResult', () => {
			const res = new InvocationResultImpl(64, true, [{ value: 6, type: ParameterType.Integer }])

			roundTrip(res, RootType.InvocationResult)
		})

		test('Qualified node', () => {
			const res = [new QualifiedElementImpl('2.3.1', new EmberNodeImpl('Test node'))]
			roundTrip(res, RootType.Elements)
		})

		test('Numbered node', () => {
			const res = [new NumberedTreeNodeImpl(0, new EmberNodeImpl('Test node'))]
			roundTrip(res, RootType.Elements)
		})

		test('Numbered tree', () => {
			const res = [
				new NumberedTreeNodeImpl(0, new EmberNodeImpl('Test node'), [
					new NumberedTreeNodeImpl(0, new EmberNodeImpl('Test node 1'))
				])
			]
			if (!res[0].children) {
				fail(`Tree must have children`)
			}
			res[0].children[0].parent = res[0]
			roundTrip(res, RootType.Elements)
		})

		test('Qualified tree', () => {
			const res = [
				new QualifiedElementImpl('2.3.1', new EmberNodeImpl('Test node'), [
					new NumberedTreeNodeImpl(0, new EmberNodeImpl('Node A'), [])
				])
			]
			if (!res[0].children) {
				fail(`Tree must have children`)
			}
			res[0].children[0].parent = res[0]
			roundTrip(res, RootType.Elements)
		})
	})
})
