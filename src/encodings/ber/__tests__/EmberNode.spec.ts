import * as Ber from '../../../Ber'
import { EmberNode } from '../../../model/EmberNode'
import { encodeNode } from '../encoder/EmberNode'
import { decodeNode } from '../decoder/EmberNode'
import { ElementType } from '../../../model/EmberElement'
import { literal } from '../../../types/types'
import { guarded } from '../decoder/DecodeResult'

describe('encodings/ber/EmberNode', () => {
	const en = literal<EmberNode>({
		type: ElementType.Node,
		identifier: 'Nodey',
		description: 'Call me nodey',
		isRoot: false,
		isOnline: true,
		schemaIdentifiers: `I'm a schema identifier\nand I'm OK`,
		templateReference: '3.2.1.2'
	})

	test('write and read a node', () => {
		const writer = new Ber.Writer()
		encodeNode(en, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeNode(reader))

		expect(decoded).toEqual(en)
	})
})
