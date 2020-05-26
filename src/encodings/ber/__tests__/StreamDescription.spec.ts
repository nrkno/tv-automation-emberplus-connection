import * as Ber from '../../../Ber'
import { StreamDescription, StreamFormat } from '../../../model/StreamDescription'
import { encodeStreamDescription } from '../encoder/StreamDescription'
import { decodeStreamDescription } from '../decoder/StreamDescription'
import { literal } from '../../../types/types'
import { guarded } from '../decoder/DecodeResult'

describe('encodings/ber/StreamDescription', () => {
	const sd = literal<StreamDescription>({
		format: StreamFormat.Int32BE,
		offset: 42
	})

	test('write and read stream description', () => {
		const writer = new Ber.Writer()
		encodeStreamDescription(sd, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeStreamDescription(reader))

		expect(decoded).toEqual(sd)
	})
})
