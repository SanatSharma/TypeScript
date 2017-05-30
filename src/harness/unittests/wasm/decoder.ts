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
        public get remaining() {
            return this.buffer.length - this.offset;
        }

        public get offset() {
            return this._offset;
        }

        /** Helper for vetting that an argument with the given 'name' has a non-negative integer 'value'. */
        private assert_nonnegative_integer(value: number, name: string) {
            if (!is_uint32(value)) {
                Debug.fail(`'${name}' must be a non-negative integer.  Got '${value}'.`);
            }
        }

        /** Helper used to read a consecutive sequence of type 'T', returned as a T[].  The given
            'read' function is invoked 'count' times to do the decoding. */
        private sequenceOf<T>(count: number, read: () => T) {
            this.assert_nonnegative_integer(count, "count");

            const result: T[] = [];
            for (let i = count; i > 0; i--) {
                result.push(read.apply(this));
            }

            return result;
        }

        // Data Types

        /** Reads the next byte from the underlying buffer, as-is. */
        public uint8() {
            Debug.assert(this.remaining > 0,                    // Bounds-check
                "Must not read past the end of the buffer.");

            const result = this.buffer[this.offset];            // Get the next available byte.
            assert_is_uint8(result);                            // Sanity check that it is a byte.
            this._offset++;                                     // Advance to the next byte.

            return result;                                      // Return the result.
        }

        /** Read the next 'length' number of bytes from the undelying buffer, as-is. */
        public bytes(count: number) {
            this.assert_nonnegative_integer(count, "count");
            Debug.assert(count <= this.remaining,
                "'count' must not exceed the remaining bytes in the buffer.", () => `got '${count}'.`);

            const bytes = this.buffer.slice(this.offset, this.offset + count);

            Debug.assert(bytes.length === count);      // Paranoid check that we sliced off the expected number of bytes.
            this._offset += count;

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

        /** Read a byte-length prefixed UTF-8 encoded string. */
        public utf8() {
            const length = this.varuint32();
            let result = "";

            this.bytes(length).forEach(ch => {
                // TODO: Support full UTF-8.
                //       https://github.com/DLehenbauer/TypeScript/issues/2
                Debug.assert(ch < 0x80,
                    "Full UTF-8 support is not yet implemented.");
                result += String.fromCharCode(ch);
            });

            return result;
        }

        // Instruction Opcodes

        /** Reads an 'opcode', asserting it is a valid value in the enum. */
        public op() {
            // In the MVP, the opcodes of instructions are all encoded in a single byte since there are fewer than 256 opcodes.
            // Future features like SIMD and atomics will bring the total count above 256 and so an extension scheme will be
            // necessary, designating one or more single-byte values as prefixes for multi-byte opcodes.
            const op = this.uint8();
            assert_is_opcode(op);
            return op;
        }

        // Language Types

        /** Read a 'type' as a varint7, asserting it is a valid value in the enum. */
        public type() { return to_type(this.varint7()); }

        /** Read a 'value_type' as a varint7, asserting it is a valid value in the enum. */
        public value_type() { return to_value_type(this.varint7()); }

        /** Invoked by 'type_section()' to read a 'func_type'.  The leading 'form' has already
            been consumed at this point. */
        private func_type() {
            // Note: The leading 'form' type was consumed by 'type_section' in order to dispatch
            //       to this helper.

            const param_count = this.varuint32();           // varuint32    the number of parameters to the function
            const param_types = this.sequenceOf(            // value_type*  the parameter types of the function
                param_count, this.value_type);

            // Note: In the future, return_count and return_type might be generalised to allow multiple values.
            const return_count = this.varuint1();           // varuint1     the number of results from the function
            const return_types = this.sequenceOf(           // value_type   the result type of the function (if return_count is 1)
                return_count, this.value_type);

            return new FuncType(param_types, return_types);
        }

        // Other Types

        /** Read an 'external_kind' as a uint8, asserting it is a valid value in the enum. */
        public external_kind() { return to_external_kind(this.uint8()); }

        // Module Structure

        /** Read the module preamble. */
        public module_preamble() {
            const magic_number = this.uint32();             // uint32       Magic number 0x6d736100 (i.e., '\0asm')

            Debug.assert(magic_number === 0x6d736100,
                "Module preamble must start with 0x6d736100.",
                () => `got 0x${hex32(magic_number)}.`);

            return new Preamble(this.uint32());      // uint32       Version number
        }
        /** Read a 'section_code' as a varuint7, asserting it is a valid value in the enum. */
        public section_code() { return to_section_code(this.varuint7()); }

        /** Read the next 'Section' from the module (including the leading 'section_code'.) */
        public section() : Section {
            const id = this.section_code();                 // varuint7     section code
            const payload_len = this.varuint32();           // varuint32    size of this section in bytes

            switch (id) {
                case section_code.Custom:
                    return this.custom_section(payload_len);

                case section_code.Type:
                    return this.type_section();

                case section_code.Function:
                    return this.function_section();

                case section_code.Export:
                    return this.export_section();

                case section_code.Code:
                    return this.code_section();

                default:
                    Debug.fail(`Unsupported section id '${id}' in module.`);
            }
        }

        /** Invoked by 'section()' to read the payload of the custom section (including the name).
            The leading 'section_code' and 'payload_len' have already been consumed at this point. */
        private custom_section(payload_len: number) {
            const custom_start = this.offset;                   // Remember the offset before name fields.  Used to calculate
                                                                // the combined sizeof(name) and sizeof(name_len) below.

            // Note: At this point we know we are decoding a custom section (i.e., id = 0), so
            //       the following two fields are not optional.
            const name = this.utf8();                           // varuint32?   length of the section name in bytes, present if id == 0
                                                                // bytes?       section name string, present if id == 0

            const payload_data = this.bytes(                    // bytes        content of this section, of length
                payload_len - (this.offset - custom_start));    //              payload_len - sizeof(name) - sizeof(name_len)

            return new CustomSection(name, payload_data);
        }

        /** Invoked by 'section()' to read the 'payload_data' of the type section.  The leading
            'section_code' and 'payload_len' have already been consumed at this point. */
        private type_section() {
            const types = new TypeSection();

            const count = this.varuint32();                 // varuint32    count of type entries to follow
            for (let i = count; i > 0; i--) {               // func_type*   repeated type entries
                // Per the below note, the intent of the 'form' field in 'func_type' is to distinguish between
                // future type entries.  Therefore, we decode the 'form' field of the 'func_type' here instead
                // of inside 'func_type()'.
                const form = this.varint7();                // varint7      the value for the func type constructor (from 'func_type')
                switch (form) {
                    // Note: In the future, this section may contain other forms of type entries as well, which
                    //       can be distinguished by the form field of the type encoding.
                    case type.func:
                        types.add(this.func_type());        // Read the remainder of the 'func_type'.
                        break;
                    default:
                        throw Debug.fail(`Unsupported form '${form}' in type section.`);
                }
            }

            return types;
        }

        /** Invoked by 'section()' to read the 'payload_data' of the function section.  The leading
            'section_code' and 'payload_len' have already been consumed at this point. */
        private function_section() {
            const count = this.varint32();                          // varuint32    count of signature indices to follow
            const types = this.sequenceOf(count, this.varuint32);   // varuint32*   sequence of indices into the type section

            const result = new FunctionSection();
            types.forEach(type => result.add(type));
            return result;
        }
        /** Invoked by 'section()' to read the 'payload_data' of the export section.  The leading
            'section_code' and 'payload_len' have already been consumed at this point. */
        private export_section() {
            const count = this.varint32();                              // varuint32        count of export entries to follow
            const entries = this.sequenceOf(count, this.export_entry);  // export_entry*    repeated export entries

            const result = new ExportSection();
            entries.forEach(entry => result.add(entry));
            return result;
        }

        /** Invoked by 'export_section()' to read each 'export_entry'. */
        private export_entry() {
            return new ExportEntry(
                this.utf8(),                                // varuint32        field name string length
                                                            // bytes            field name string of field_len bytes
                this.external_kind(),                       // external_kind    the kind of definition being exported
                this.varuint32());                          // varuint32        the index into the corresponding index space
        }

        /** Invoked by 'section()' to read the 'payload_data' of the code section.  The leading
            'section_code' and 'payload_len' have already been consumed at this point. */
        public code_section() {
            const code = new CodeSection();

            const count = this.varuint32();                 // varuint32        count of function bodies to follow
            for (let i = count; i > 0; i--) {               // function_body*   sequence of Function Bodies
                code.add(this.function_body());
            }

            return code;
        }

        // Function Bodies

        /** Invoked by 'code_section()' to read each 'function_body'. */
        private function_body() {
            const body_size = this.varuint32();                     // varuint32        size of function body to follow, in bytes

            // Used to calculate the remaining bytes for the 'code' field below.
            const startLocals = this.offset;

            const local_count = this.varuint32();                   // varuint32    number of local entries
            const locals = this.sequenceOf(                         // local_entry* local variables
                local_count, this.local_entry);

            // Calculate the remaining bytes in the 'function_body' entry to determine how many
            // bytes to read for the 'code' field.
            const localsSize = (this.offset - startLocals);
            const code = this.bytes(body_size - localsSize);        // byte*            bytecode of the function
                                                                    // byte             0x0b, indicating the end of the body

            return new FunctionBody(locals, code);                  // Asserts that 'code' terminates with 0x0b.
        }

        /** Invoked by 'function_body()' to read each 'local_entry'. */
        private local_entry() {
            return new LocalEntry(
                this.varuint32(),
                this.varint7());
        }
    }
}