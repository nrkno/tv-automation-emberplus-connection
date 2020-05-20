import { EmberValue } from '../../model/EmberValue'

export { decode, encode }

function decode(data: any): EmberValue {
	if (data.type === Buffer.name) {
		return Buffer.from(data.value)
	}

	return data.value
}

function encode(value: EmberValue): any {
	if (value instanceof Buffer) {
		const { type, data } = value.toJSON()
		return { type, value: data }
	}

	return { type: typeof value, value }
}
