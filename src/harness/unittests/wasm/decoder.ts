/// <reference path="../../../compiler/transformers/wasm/binary.ts" />
/// <reference path="../../../compiler/core.ts" />

namespace ts.wasm {
    /**
     * Binary encoder for reading WebAssembly modules.
     */
    export class Decoder {
        private _offset = 0;

        /** Construct a new Decoder instance to read the given buffer. */
        constructor(private buffer: number[]) {}

        /** Returns the number of unconsumed bytes remaining in the buffer. */
        private get remaining() {
            return this.buffer.length - this._offset;
        }

        // Data Types

        /** Reads the next byte from the underlying buffer, as-is. */
        public uint8() {
            Debug.assert(this.remaining > 0,                    // Bounds-check
                "Must not read past the end of the buffer.");

            const result = this.buffer[this._offset];           // Get the next available byte.
            assert_is_uint8(result);                            // Sanity check that it is a byte.
            this._offset++;                                     // Advance to the next byte.

            return result;                                      // Return the result.
        }

        /** Read the next 4 bytes from the underlying buffer, returned as a little-endian unsigned 32b integer. */
        public uint32() {
            return (this.uint8()
                | (this.uint8() << 8)
                | (this.uint8() << 16)
                | (this.uint8() << 24)) >>> 0;
        }

        /** Read a LEB128 encoded 32b unsigned integer. */
        public varuint32() {
            let result = 0;                             // Accumulator for decoded result.

            for (let shift = 0; ; shift += 7) {
                const byte = this.uint8();              // Get the next encoded byte.
                result |= ((byte & 0x7F) << shift);     // Copy lower 7 bits into the result.
                if ((byte & 0x80) === 0) {              // High bit signals if there is more to decode.
                    assert_is_int32(result);            // If done, vet that result is a 32b integer (currently interpretted as signed).
                    return result >>> 0;                // Coerce to unsigned and return.
                }
            }
        }

        /** Read a LEB128 encoded 1b unsigned integer. */
        public varuint1() {
            const result = this.varuint32();
            assert_is_uint1(result);
            return result;
        }

        /** Read a LEB128 encoded 7b unsigned integer. */
        public varuint7() {
            const result = this.varuint32();
            assert_is_uint7(result);
            return result;
        }

        /** Read a LEB128 encoded 32b signed integer. */
        public varint32() {
            let result = 0;                                 // Accumulator for decoded result.
            let shift = 0;                                  // Number of bits to shift next encoded byte.
            let byte: number;                               // Byte currently being decoded.

            do {
                byte = this.uint8();                        // Get the next encoded byte.
                result |= ((byte & 0x7F) << shift);         // Copy lower 7 bits into the result.
                shift += 7;
            } while (byte >= 0x80);                         // High bit signals there is more to decode.

            if ((byte & 0x40) !== 0) {                      // 2nd highest bit indicates the result is negative.
                if (shift < 32) {                           // So sign extend, unless we ended up with a 5B encoding.
                    result |= (-1) << shift;                // In a 5B encoding, the sign bit is already set in the while..loop
                }                                           // and sign extension must be skipped because the << rval is
            }                                               // truncated to 5b, resulting in unintended consequences.

            return result;
        }

        /** Read a LEB128 encoded 7b signed integer. */
        public varint7() {
            const result = this.varint32();
            assert_is_int7(result);
            return result;
        }

        // Language Types

        /** Read a 'type' as a varint7, asserting it is a valid value in the enum. */
        public type() { return to_type(this.varint7()); }

        /** Read a 'value_type' as a varint7, asserting it is a valid value in the enum. */
        public value_type() { return to_value_type(this.varint7()); }

        // Other Types

        /** Read an 'external_kind' as a uint8, asserting it is a valid value in the enum. */
        public external_kind() { return to_external_kind(this.uint8()); }

        // Module Structure

        /** Read a 'section_code' as a varuint7, asserting it is a valid value in the enum. */
        public section_code() { return to_section_code(this.varuint7()); }
    }
}