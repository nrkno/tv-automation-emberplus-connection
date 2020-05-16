import * as Ber from '../../../Ber'
import { StreamEntry, StreamEntryImpl } from '../../../model/StreamEntry'
import { EmberTypedValue } from '../../../model/EmberTypedValue'

import { StreamEntryBERID, StreamEntriesBERID } from '../constants'

export { decodeStreamEntry, decodeStreamEntries }

function decodeStreamEntries(reader: Ber.Reader): Array<StreamEntry> {
	const seq = reader.getSequence(StreamEntriesBERID)
	const streamEntries: Array<StreamEntry> = []
	while (seq.remain > 0) {
		const tag = seq.peek()
		if (tag !== Ber.CONTEXT(0)) {
			throw new Error(``)
		}
		const data = seq.getSequence(Ber.CONTEXT(0))
		const rootEl = decodeStreamEntry(data)
		streamEntries.push(rootEl)
	}
	return streamEntries
}

function decodeStreamEntry(reader: Ber.Reader): StreamEntry {
	const ber = reader.getSequence(StreamEntryBERID)
	let identifier: number | null = null
	let value: EmberTypedValue | null = null
	while (ber.remain > 0) {
		const tag = ber.peek()
		if (tag === null) {
			throw new Error(``)
		}
		const seq = ber.getSequence(tag)
		switch (tag) {
			case Ber.CONTEXT(0):
				identifier = seq.readInt()
				break
			case Ber.CONTEXT(1):
				value = seq.readValue()
				break
			default:
				throw new Error(``)
		}
	}
	if (identifier === null || value === null) {
		throw new Error(``)
	}
	return new StreamEntryImpl(identifier, value)
}
