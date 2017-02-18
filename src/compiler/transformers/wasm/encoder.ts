/// <reference path="binary.ts" />

/* @internal */
namespace ts.wasm {
    /**
     * Binary encoder for writting WebAssembly modules.
     */
    export class Encoder {
        private _buffer: number[] = [];

        /** Returns the array of bytes containing the encoded WebAssembly module. */
        public get buffer() { return this._buffer; }

        // Data Types

        /** Write the given unsigned 8b integer, as-is. */
        public uint8(u8: number) {
            assert_is_uint8(u8);

            this._buffer.push(u8);
        }

        /** Write the given sequence of bytes, as-is. */
        public bytes(bytes: number[]) {
            bytes.forEach(byte => { assert_is_uint8(byte); });

            this._buffer = this._buffer.concat(bytes);
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

        /** Write a 'func_type'. */
        public func_type(func: FuncType) {
            this.type(type.func);                                           // varint7      the value for the func type constructor (i.e., type.func)
            this.varuint32(func.param_types.length);                        // varuint32    the number of parameters to the function
            func.param_types.forEach(item => this.value_type(item));        // value_type*  the parameter types of the function

            // Note: In the future, return_count and return_type might be generalised to allow multiple values.
            this.varuint1(func.return_types.length);                        // varuint1     the number of results from the function
            func.return_types.forEach(item => this.value_type(item));       // value_type   the result type of the function (if return_count is 1)
        }

        // Other Types

        /** Write an 'external_kind' as a uint8, asserting it is a valid value in the enum. */
        public external_kind(kind: external_kind) { this.uint8(to_external_kind(kind)); }

        // Module Structure

        /** Write the 'module_preamble'. */
        public module_preamble(preamble: Preamble) {
            this.uint32(preamble.magic_number);         // uint32       Magic number 0x6d736100 (i.e., '\0asm')
            this.uint32(preamble.version);              // uint32       Version number
        }

        /** Write a 'section_code' as a varuint7, asserting it is a valid value in the enum. */
        public section_code(code: section_code) { this.varuint7(to_section_code(code)); }

        /**
         * Helper that invokes 'getPayload' with a nested 'payloadEncoder' to get the section's payload_data'.
         * It then writes the given 'id', 'payload_len', and 'payload_data'.  Can be used for custom sections
         * by including the 'name_len' and 'name' in the 'payload_data'.
         */
        private section<T extends Section>(section: T, getPayload: (payloadEncoder: Encoder) => void) {
            const payload = new Encoder();
            getPayload(payload);

            this.section_code(section.id);              // varuint7     section code
            this.varuint32(payload.buffer.length);      // varuint32    size of this section in bytes
            this.bytes(payload.buffer);                 // (name_len, name, and payload_data)
        }

        /** Write the given custom section.  */
        public custom_section(custom: CustomSection) {
            this.section(custom, encoder => {
                // Note: At this point we know we are encoding a custom section (i.e., id = 0), so
                //       the following two fields are not optional.
                encoder.varuint32(custom.name.length);                  // varuint32?   length of the section name in bytes, present if id == 0
                encoder.bytes(custom.name);                             // bytes?       section name string, present if id == 0
                encoder.bytes(custom.payload_data);                     // bytes        content of this section, of length
            });
        }

        /** Write the given type section. */
        public type_section(types: TypeSection) {
            this.section(types, encoder => {
                encoder.varuint32(types.entries.length);                // varuint32    count of type entries to follow
                types.entries.forEach(                                  // func_type*   repeated type entries
                    signature => encoder.func_type(signature));
            });
        }
    }
}