import * as Ber from '../../../Ber'
import { Connection, ConnectionOperation, ConnectionDisposition } from '../../../model/Connection'
import { encodeConnection } from '../encoder/Connection'
import { decodeConnection } from '../decoder/Connection'
import { literal } from '../../../types/types'
import { guarded } from '../decoder/DecodeResult'

describe('encodings/ber/Connection', () => {
	const connection = literal<Connection>({
		target: 42,
		sources: [89, 98],
		operation: ConnectionOperation.Connect,
		disposition: ConnectionDisposition.Tally
	})

	test('write and read a connection', () => {
		const writer = new Ber.Writer()
		encodeConnection(connection, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeConnection(reader))

		expect(decoded).toEqual(connection)
	})

	test('write and read a connection - minimal', () => {
		const minCon = { target: 42 } as Connection
		const writer = new Ber.Writer()
		encodeConnection(minCon, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeConnection(reader))

		expect(decoded).toEqual(minCon)
	})
})
