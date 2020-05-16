import * as Ber from '../../../Ber'
import { Invocation, InvocationImpl } from '../../../model/Invocation'
import { EmberTypedValue } from '../../../model/EmberTypedValue'

import { InvocationBERID } from '../constants'

export { decodeInvocation }

function decodeInvocation(reader: Ber.Reader): Invocation {
	const ber = reader.getSequence(InvocationBERID)
	let id: number | undefined = undefined
	const args: Array<EmberTypedValue> = []
	let argSeq: Ber.Reader
	while (ber.remain > 0) {
		const tag = ber.peek()
		if (tag === null) {
			throw new Error(``)
		}
		const seq = ber.getSequence(tag)
		switch (tag) {
			case Ber.CONTEXT(0):
				id = seq.readInt()
				break
			case Ber.CONTEXT(1):
				argSeq = seq.getSequence(Ber.BERDataTypes.SEQUENCE)
				while (argSeq.remain > 0) {
					const dataSeq = argSeq.getSequence(Ber.CONTEXT(0))
					// const dataTag = dataSeq.peek() // TODO I think readValue gets the tag
					args.push(dataSeq.readValue())
				}
				break
			default:
				throw new Error(`Decode invocation: Unknown invocation property `)
		}
	}
	return new InvocationImpl(id, args)
}
