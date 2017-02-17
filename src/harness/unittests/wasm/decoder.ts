/// <reference path="../../../compiler/transformers/wasm/binary.ts" />
/// <reference path="../../../compiler/core.ts" />

namespace ts.wasm {
    /**
     * Binary encoder for reading WebAssembly modules.
     */
    export class Decoder {
        private offset = 0;

        /** Construct a new Decoder instance to read the given buffer. */
        constructor(private buffer: number[]) {}

        /** Returns the number of unconsumed bytes remaining in the buffer. */
        private get remaining() {
            return this.buffer.length - this.offset;
        }

        // Data Types

        /** Reads the next byte from the underlying buffer, as-is. */
        public uint8() {
            Debug.assert(this.remaining > 0,                    // Bounds-check
                "Must not read past the end of the buffer.");

            const result = this.buffer[this.offset];            // Get the next available byte.
            assert_is_uint8(result);                            // Sanity check that it is a byte.
            this.offset++;                                      // Advance to the next byte.

            return result;                                      // Return the result.
        }

        /** Read the next 'length' number of bytes from the undelying buffer, as-is. */
        public bytes(length: number) {
            assert_is_uint32(length);
            Debug.assert(length <= this.remaining,
                "Must not index past the end of the buffer.");

            const bytes = this.buffer.slice(this.offset, this.offset + length);

            Debug.assert(bytes.length === length);      // Paranoid check that we sliced off the expected number of bytes.
            this.offset += length;

            return bytes;
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

        /** Read the module preamble. */
        public module_preamble() {
            const magic_number = this.uint32();             // uint32       Magic number 0x6d736100 (i.e., '\0asm')

            Debug.assert(magic_number === 0x6d736100,
                "Module preamble must start with 0x6d736100.",
                () => `got 0x${hex8(magic_number)}.`);

            return new Preamble(this.uint32());      // uint32       Version number
        }
        /** Read a 'section_code' as a varuint7, asserting it is a valid value in the enum. */
        public section_code() { return to_section_code(this.varuint7()); }

        /** Read the next 'Section' from the module (including the leading 'section_code'.) */
        public section() {
            const id = this.varuint7();

            switch (id) {
                case section_code.Custom:
                    return this.custom_section();

                default:
                    Debug.fail(`Unsupported section id '${id}' in module.`);
            }
        }

        /** Invoked by 'section()' to read the contents of the custom section.  The leading
            'secton_code' has already been consumed at this point.*/
        private custom_section() {
            const payload_len = this.varuint32()                // varuint32    size of this section in bytes

            const custom_start = this.offset;                   // Remember the offset before name fields, used to calculate
                                                                // the combined sizeof(name) and sizeof(name_len) below.

            // Note: At this point we know we are decoding a custom section (i.e., id = 0), so
            //       the following two fields are not optional.
            const name_len = this.varuint32();                  // varuint32?   length of the section name in bytes, present if id == 0
            const name = this.bytes(name_len);                  // bytes?       section name string, present if id == 0

            const payload_data = this.bytes(                    // bytes        content of this section, of length
                payload_len - (this.offset - custom_start));    //              payload_len - sizeof(name) - sizeof(name_len)

            return new CustomSection(name, payload_data);
        }
    }
}