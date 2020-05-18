// import { Reader } from 'asn1'
import Long from 'long'
import { ASN1Error, UnimplementedEmberTypeError } from '../Errors'
import { BERDataTypes } from './BERDataTypes'
import { UNIVERSAL } from './functions.js'
import { EmberValue } from '../types/types'

export { ExtendedReader as Reader }

var ASN1 = require('./types');
var errors = require('./errors');


///--- Globals

var newInvalidAsn1Error = errors.newInvalidAsn1Error;

///--- API

class Reader {
	private _buf: Buffer
	private _size: number
	private _blocklevel: number = 0
	private _blockInfo: { [ index: number]: number } = {}
	private _len: number = 0
	private _offset: number = 0
	constructor(data: Buffer) {
		if (!data || !Buffer.isBuffer(data)) {
			throw new TypeError('data must be a node Buffer');
		}
		this._buf = data
		this._size = data.length
	}

	get length() {
		return this._len
	}

	get offset() {
		return this._offset
	}

	get remain() {
		return this._size - this._offset
	}

	get buffer() {
		return this._buf.slice(this._offset)
	}

	/**
	 * Reads a single byte and advances offset; you can pass in `true` to make this
 	 * a "peek" operation (i.e., get the byte, but don't advance the offset).
	 * @param peek true means don't move offset.
	 * @returns the next byte, null if not enough data.
	 */
	public readByte (peek: boolean): number | null {
		if (this._size - this._offset < 1)
		return null;
  
		var b = this._buf[this._offset] & 0xff;
  
		if (!peek)
	  	this._offset += 1;
  
		return b;
	}

	public readBlock (offset?: number) {
		if (offset === undefined) {
			offset = this._offset
		}
		let currOffset = offset
		let b, lenB: number

		if (this._blockInfo[offset] !== undefined) {
			return this._blockInfo[offset]
		}

		while(this.remain > 0) {
			b = this._buf[currOffset++];
			lenB = this._buf[currOffset++];

			if ((b === 0) && (lenB === 0)) {
				break; // end of block
			}

			let len = 0;
			if ((lenB & 0x80) == 0x80) {
				lenB &= 0x7f;

				if (lenB == 0) {
					this._blocklevel++;
					lenB = this.readBlock(currOffset) as number // TODO smell
					this._blocklevel--;
				}
				else {
					if (lenB > 4)
						throw new Error('encoding too long');

					if (this._size - this.offset < lenB) {
						return null;
					}

					for (let i = 0; i < lenB; i++) {
						len = (len << 8) + (this._buf[currOffset++] & 0xff);
					}
					lenB = len;
				}
			}
			currOffset += lenB;
			if (currOffset > this._size) {
				throw new Error("invalid block at offset " + offset);
			}
		}
		lenB = currOffset - offset;
		this._blockInfo[offset] = lenB;

		return lenB;
	}

	public peek() {
  		return this.readByte(true)
	}

	/**
	 * Reads a (potentially) variable length off the BER buffer.  This call is
	 * not really meant to be called directly, as callers have to manipulate
	 * the internal buffer afterwards.
	 * 
	 * As a result of this call, you can call `Reader.length`, until the
	 * next thing called that does a readLength.
	 * @param offset Offset to advance the buffer.
	 * @returns Length if available.
	 */
	public readLength (offset?: number): number | null {
		if (offset === undefined)
			offset = this._offset;

		if (offset >= this._size)
			return null;

		let lenB = this._buf[offset++] & 0xff;
		if (lenB === null)
			return null;
		

		if ((lenB & 0x80) === 0x80) {
			lenB &= 0x7f;

			if (lenB === 0) {
				this._len = this.readBlock(offset) as number // TODO smell
			}
			else {
				if (lenB > 4)
					throw newInvalidAsn1Error('encoding too long');

				if (this._size - offset < lenB)
					return null;

				this._len = 0;
				for (let i = 0; i < lenB; i++)
					this._len = (this._len << 8) + (this._buf[offset++] & 0xff);      
			}
		} else {
			// Wasn't a variable length
			this._len = lenB
		}

		return offset
	}

	/**
	 * Parses the next sequence in this BER buffer.
	 * 
	 * To get the length of the sequence, call `Reader.length`.
	 * @param tag The sequence's tag.
	 */
	public readSequence (tag: number): number | null {
  		let seq = this.peek()
  		if (tag !== undefined && tag !== seq)
			throw newInvalidAsn1Error('Expected 0x' + tag.toString(16) +
									': got 0x' + seq!.toString(16))
		if (seq === null)
			return null

  		let o = this.readLength(this._offset + 1) // stored in `length`
		if (o === null)
			return null

		this._offset = o
		return seq
	}

	public readInt (): number | null {
  		return this._readTag(ASN1.Integer);
	}

	public readBoolean () {
  		return (this._readTag(ASN1.Boolean) === 0 ? false : true);
	}

	public readEnumeration () {
 		return this._readTag(ASN1.Enumeration);
	}

	public readString (tag: number, retbuf: true): Buffer | null
	public readString (tag?: number, retbuf?: false): string | null
	public readString (tag: number = ASN1.OctetString, retbuf: boolean = false): Buffer | string | null {
		let b = this.peek()
		if (b === null) 
			return null;

		if (b !== tag)
			throw newInvalidAsn1Error('Expected 0x' + tag.toString(16) +
									': got 0x' + b.toString(16));

		let o = this.readLength(this._offset + 1); // stored in `length`

		if (o === null)
			return null;

		if (this.length > this._size - o)
			return null;

		var length = this.length;
		if (this._blockInfo[this._offset + 2] !== undefined) {
			length = length - 2;
		}

		this._offset = o;
		
		if (length === 0)
			return retbuf ? Buffer.alloc(0) : '';

		const str = this._buf.slice(this._offset, this._offset + length);
		this._offset += this.length;

		return retbuf ? str : str.toString('utf8');
	}

	public readRelativeOID (tag: number = ASN1.RelativeOID) {
		let b = this.readString(tag, true)
		if (b === null)
			return null

		let values = []
		let value = 0

		for (let i = 0; i < b.length; i++) {
			let byte = b[i] & 0xff

			value += byte & 0x7F
			if ((byte & 0x80) == 0x80) {
				value <<= 7
				continue
			}
			values.push(value)
			value = 0
		}

		return values.join('.')
	}

	public readOID (tag: number = ASN1.OID) {
		let b = this.readString(tag, true);
		if (b === null)
			return null;

		let values = [];
		let value = 0;

		for (let i = 0; i < b.length; i++) {
			let byte = b[i] & 0xff;

			value <<= 7;
			value += byte & 0x7f;
			if ((byte & 0x80) === 0) {
			values.push(value);
			value = 0;
			}
		}

		value = values.shift()! // TODO smell
		values.unshift(value % 40)
		values.unshift((value / 40) >> 0)

		return values.join('.')
	}

	private _readTag (tag: number): number | null {
		let b = this.peek();

		if (b === null)
			return null;

		if (b !== tag)
			throw newInvalidAsn1Error('Expected 0x' + tag.toString(16) +
									': got 0x' + b.toString(16));

		let o = this.readLength(this._offset + 1); // stored in `length`
		if (o === null)
			return null;

		if (this.length > 8)
			throw newInvalidAsn1Error('Integer too long: ' + this.length);

		if (this.length > this._size - o)
			return null;
		this._offset = o;

		let fb = this._buf[this._offset];
		let value = 0;

		for (var i = 0; i < this.length; i++) {
			value <<= 8;
			value |= (this._buf[this._offset++] & 0xff);
		}

		if ((fb & 0x80) === 0x80 && i !== 4)
			value -= (1 << (i * 8));

		return value >> 0;
	}
}

class ExtendedReader extends Reader {
	constructor(data: Buffer) {
		super(data)
	}

	getSequence(tag: number): ExtendedReader {
		const buf = this.readString(tag, true)
		return new ExtendedReader(buf!)
	}

	readValue(): EmberValue {
		const tag = this.peek()
		if (!tag) {
			throw new Error('No tag available')
		}

		switch (tag) {
			case BERDataTypes.STRING:
				return this.readString(BERDataTypes.STRING)
			case BERDataTypes.INTEGER:
				return this.readInt()
			case BERDataTypes.REAL:
				return this.readReal()
			case BERDataTypes.BOOLEAN:
				return this.readBoolean()
			case BERDataTypes.OCTETSTRING:
				return this.readString(UNIVERSAL(4), true)
			case BERDataTypes.RELATIVE_OID:
				return this.readOID(BERDataTypes.RELATIVE_OID)
			default:
				throw new UnimplementedEmberTypeError(tag)
		}
	}

	readReal(tag?: number): number | null {
		if (tag !== null) {
			tag = UNIVERSAL(9)
		}

		const b = this.peek()
		if (b === null) {
			return null
		}

		const buf = this.readString(b, true)
		if (buf!.length === 0) {
			return 0
		}

		const preamble = buf!.readUInt8(0)
		let o = 1

		if (buf!.length === 1) {
			switch (preamble) {
				case 0x40:
					return Infinity
				case 0x41:
					return -Infinity
				case 0x42:
					return NaN
			}
		}

		const sign = preamble & 0x40 ? -1 : 1
		const exponentLength = 1 + (preamble & 3)
		const significandShift = (preamble >> 2) & 3

		let exponent = 0

		if (buf!.readUInt8(o) & 0x80) {
			exponent = -1
		}

		if (buf!.length - o < exponentLength) {
			throw new ASN1Error('Invalid ASN.1; not enough length to contain exponent')
		}

		for (var i = 0; i < exponentLength; i++) {
			exponent = (exponent << 8) | buf!.readUInt8(o++)
		}

		let significand = new Long(0, 0, true)
		while (o < buf!.length) {
			significand = significand.shl(8).or(buf!.readUInt8(o++))
		}

		significand = significand.shl(significandShift)

		while (significand.and(Long.fromBits(0x00000000, 0x7ffff000, true)).eq(0)) {
			significand = significand.shl(8)
		}

		while (significand.and(Long.fromBits(0x00000000, 0x7ff00000, true)).eq(0)) {
			significand = significand.shl(1)
		}

		significand = significand.and(Long.fromBits(0xffffffff, 0x000fffff, true))

		let bits = Long.fromNumber(exponent).add(1023).shl(52).or(significand)
		if (sign < 0) {
			bits = bits.or(Long.fromBits(0x00000000, 0x80000000, true))
		}

		const fbuf = Buffer.alloc(8)
		fbuf.writeUInt32LE(bits.getLowBitsUnsigned(), 0)
		fbuf.writeUInt32LE(bits.getHighBitsUnsigned(), 4)

		return fbuf.readDoubleLE(0)
	}
}
