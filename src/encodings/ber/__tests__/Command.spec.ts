import * as Ber from '../../../Ber'
import {
	Command,
	CommandType,
	Subscribe,
	Unsubscribe,
	GetDirectory,
	FieldFlags,
	Invoke
} from '../../../model/Command'
import { encodeCommand } from '../encoder/Command'
import { decodeCommand } from '../decoder/Command'
import { ElementType } from '../../../model/EmberElement'
import { guarded } from '../decoder/DecodeResult'

describe('encodings/ber/Command', () => {
	function testCommand(command: Command): void {
		const writer = new Ber.Writer()
		encodeCommand(command, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeCommand(reader))

		expect(decoded).toEqual(command)
	}

	test('Subscribe', () => {
		const command: Subscribe = {
			type: ElementType.Command,
			number: CommandType.Subscribe
		}
		testCommand(command)
	})

	test('Unsubscribe', () => {
		const command: Unsubscribe = {
			type: ElementType.Command,
			number: CommandType.Unsubscribe
		}
		testCommand(command)
	})

	test('GetDirectory', () => {
		const command: GetDirectory = {
			type: ElementType.Command,
			number: CommandType.GetDirectory,
			dirFieldMask: FieldFlags.All
		}
		testCommand(command)
	})

	test('Invoke', () => {
		const command: Invoke = {
			type: ElementType.Command,
			number: CommandType.Invoke,
			invocation: { args: [] }
		}
		testCommand(command)
	})
})
