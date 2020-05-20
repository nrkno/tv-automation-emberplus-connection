import { EmberTypedValue } from '../../model/EmberTypedValue'
import { decode as decodeEmberValue, encode as encodeEmberValue } from './EmberValueCodec'

export { decode, encode }

function decode(data: any): EmberTypedValue {
	const { type, value } = data

	return { type, value: decodeEmberValue(value) }
}

function encode(data: EmberTypedValue): any {
	const { type, value } = data

	return { type, value: encodeEmberValue(value) }
}
