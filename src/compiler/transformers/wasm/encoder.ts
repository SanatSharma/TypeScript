/// <reference path="binary.ts" />

/* @internal */
namespace ts.wasm {
    /**
     * Binary encoder for writting WebAssembly modules.
     */
    export class Encoder {
        private buffer: number[] = [];

        /** Returns the array of bytes containing the encoded WebAssembly module. */
        public get bytes() { return this.buffer; }

        // Data Types

        /** Write the given unsigned 8b integer, as-is. */
        public uint8(u8: number) {
            assert_is_uint8(u8);

            this.buffer.push(u8);
        }

        /** Write the given unsigned 32b integer as 4-bytes (little-endian). */
        public uint32(u32: number) {
            assert_is_uint32(u32);
            this.uint8(u32 & 0xFF);                              // Emit each byte in little-endian order.
            this.uint8((u32 >>> 8) & 0xFF);
            this.uint8((u32 >>> 16) & 0xFF);
            this.uint8((u32 >>> 24) & 0xFF);
        }

        /** Write an unsigned 32b integer as LEB128. */
        public varuint32(u32: number) {
            assert_is_uint32(u32);
            for (; u32 >= 0x80; u32 >>>= 7) {                   // While more than 7-bits remain, emit/remove the next 7-bits
                this.uint8(0x80 | (u32 & 0x7F));                // with the msb of the byte set to indicate more bytes remain.
            }
            this.uint8(u32);                                    // Emit the remaining bits with the msb clear to indicate the end.
        };

        /** Write an unsigned 7b integer as LEB128. */
        public varuint7(u7: number) {
            assert_is_uint7(u7);
            this.uint8(u7);                                      // (See last byte emitted by 'varuint32' above.)
        }

        /** Write an unsigned 1b integer as LEB128. */
        public varuint1(u1: number) {
            assert_is_uint1(u1);
            this.uint8(u1);                                      // (See last byte emitted by 'varuint32' above.)
        }

        /** Write a signed 32b integer as LEB128. */
        public varint32(s32: number) {
            assert_is_int32(s32);
            for (; s32 < -0x40 || s32 > 0x3F; s32 >>= 7) {      // While more than 6-bits + sign bit remain, emit/remove
                this.uint8(0x80 | (s32 & 0x7F));                // the next 7-bits with the msb set to indicate more bytes
            }                                                   // remain.
            this.uint8(s32 & 0x7F);                             // Emit the last 6-bits + sign bit with a clear msb to signal
        }                                                       // the end.

        /** Write a signed 7b integer as LEB128. */
        public varint7(s7: number) {
            assert_is_int7(s7);
            this.uint8(s7 & 0x7F);                              // (See last byte emitted by 'varint32' above.)
        }

        // Language Types

        /** Write a 'type' as a varint7, asserting it is a valid value in the enum. */
        public type(type: type) { this.varint7(to_type(type)); }

        /** Write a 'value_type' as a varint7, asserting it is a valid value in the enum. */
        public value_type(type: value_type) { this.varint7(to_value_type(type)); }

        // Other Types

        /** Write an 'external_kind' as a uint8, asserting it is a valid value in the enum. */
        public external_kind(kind: external_kind) { this.uint8(to_external_kind(kind)); }

        // Module Structure

        /** Write a 'section_code' as a varuint7, asserting it is a valid value in the enum. */
        public section_code(code: section_code) { this.varuint7(to_section_code(code)); }
    }
}