/// <reference path="decoder.ts" />
/// <reference path="../../../compiler/utilities.ts" />

namespace ts.wasm {
    /** Signature of a wasm opcode. */
    export interface OpcodeInfo {
        /** Name of the opcode. */
        name: string,

        /** Array of immediates, if any. */
        immediates: string[],

        /** Comment describing the opcode. */
        comment: string
    }

    const opcodes: OpcodeInfo[] = [];
    opcodes[0x00] = { name: "unreachable", immediates: [], comment: "trap immediately" };
    opcodes[0x01] = { name: "nop", immediates: [], comment: "no operation" };
    opcodes[0x02] = { name: "block", immediates: ["sig : block_type"], comment: "begin a sequence of expressions, yielding 0 or 1 values" };
    opcodes[0x03] = { name: "loop", immediates: ["sig : block_type"], comment: "begin a block which can also form control flow loops" };
    opcodes[0x04] = { name: "if", immediates: ["sig : block_type"], comment: "begin if expression" };
    opcodes[0x05] = { name: "else", immediates: [], comment: "begin else expression of if" };
    opcodes[0x0b] = { name: "end", immediates: [], comment: "end a block, loop, or if" };
    opcodes[0x0c] = { name: "br", immediates: ["relative_depth : varuint32"], comment: "break that targets an outer nested block" };
    opcodes[0x0d] = { name: "br_if", immediates: ["relative_depth : varuint32"], comment: "conditional break that targets an outer nested block" };
    opcodes[0x0e] = { name: "br_table", immediates: ["see below"], comment: "branch table control flow construct" };
    opcodes[0x0f] = { name: "return", immediates: [], comment: "return zero or one value from this function" };
    opcodes[0x10] = { name: "call", immediates: ["function_index : varuint32"], comment: "call a function by its index" };
    opcodes[0x11] = { name: "call_indirect", immediates: ["type_index : varuint32, reserved : varuint1"], comment: "call a function indirect with an expected signature" };
    opcodes[0x1a] = { name: "drop", immediates: [], comment: "ignore value" };
    opcodes[0x1b] = { name: "select", immediates: [], comment: "select one of two values based on condition" };
    opcodes[0x20] = { name: "get_local", immediates: ["local_index : varuint32"], comment: "read a local variable or parameter" };
    opcodes[0x21] = { name: "set_local", immediates: ["local_index : varuint32"], comment: "write a local variable or parameter" };
    opcodes[0x22] = { name: "tee_local", immediates: ["local_index : varuint32"], comment: "write a local variable or parameter and return the same value" };
    opcodes[0x23] = { name: "get_global", immediates: ["global_index : varuint32"], comment: "read a global variable" };
    opcodes[0x24] = { name: "set_global", immediates: ["global_index : varuint32"], comment: "write a global variable" };
    opcodes[0x28] = { name: "i32.load", immediates: ["memory_immediate"], comment: "load from memory" };
    opcodes[0x29] = { name: "i64.load", immediates: ["memory_immediate"], comment: "load from memory" };
    opcodes[0x2a] = { name: "f32.load", immediates: ["memory_immediate"], comment: "load from memory" };
    opcodes[0x2b] = { name: "f64.load", immediates: ["memory_immediate"], comment: "load from memory" };
    opcodes[0x2c] = { name: "i32.load8_s", immediates: ["memory_immediate"], comment: "load from memory" };
    opcodes[0x2d] = { name: "i32.load8_u", immediates: ["memory_immediate"], comment: "load from memory" };
    opcodes[0x2e] = { name: "i32.load16_s", immediates: ["memory_immediate"], comment: "load from memory" };
    opcodes[0x2f] = { name: "i32.load16_u", immediates: ["memory_immediate"], comment: "load from memory" };
    opcodes[0x30] = { name: "i64.load8_s", immediates: ["memory_immediate"], comment: "load from memory" };
    opcodes[0x31] = { name: "i64.load8_u", immediates: ["memory_immediate"], comment: "load from memory" };
    opcodes[0x32] = { name: "i64.load16_s", immediates: ["memory_immediate"], comment: "load from memory" };
    opcodes[0x33] = { name: "i64.load16_u", immediates: ["memory_immediate"], comment: "load from memory" };
    opcodes[0x34] = { name: "i64.load32_s", immediates: ["memory_immediate"], comment: "load from memory" };
    opcodes[0x35] = { name: "i64.load32_u", immediates: ["memory_immediate"], comment: "load from memory" };
    opcodes[0x36] = { name: "i32.store", immediates: ["memory_immediate"], comment: "store to memory" };
    opcodes[0x37] = { name: "i64.store", immediates: ["memory_immediate"], comment: "store to memory" };
    opcodes[0x38] = { name: "f32.store", immediates: ["memory_immediate"], comment: "store to memory" };
    opcodes[0x39] = { name: "f64.store", immediates: ["memory_immediate"], comment: "store to memory" };
    opcodes[0x3a] = { name: "i32.store8", immediates: ["memory_immediate"], comment: "store to memory" };
    opcodes[0x3b] = { name: "i32.store16", immediates: ["memory_immediate"], comment: "store to memory" };
    opcodes[0x3c] = { name: "i64.store8", immediates: ["memory_immediate"], comment: "store to memory" };
    opcodes[0x3d] = { name: "i64.store16", immediates: ["memory_immediate"], comment: "store to memory" };
    opcodes[0x3e] = { name: "i64.store32", immediates: ["memory_immediate"], comment: "store to memory" };
    opcodes[0x3f] = { name: "current_memory", immediates: ["reserved : varuint1"], comment: "query the size of memory" };
    opcodes[0x40] = { name: "grow_memory", immediates: ["reserved : varuint1"], comment: "grow the size of memory" };
    opcodes[0x41] = { name: "i32.const", immediates: ["value : varint32"], comment: "a constant value interpreted as i32" };
    opcodes[0x42] = { name: "i64.const", immediates: ["value : varint64"], comment: "a constant value interpreted as i64" };
    opcodes[0x43] = { name: "f32.const", immediates: ["value : uint32"], comment: "a constant value interpreted as f32" };
    opcodes[0x44] = { name: "f64.const", immediates: ["value : uint64"], comment: "a constant value interpreted as f64" };
    opcodes[0x45] = { name: "i32.eqz", immediates: [], comment: "compare equal to zero (return 1 if operand is zero, 0 otherwise)" };
    opcodes[0x46] = { name: "i32.eq", immediates: [], comment: "sign-agnostic compare equal" };
    opcodes[0x47] = { name: "i32.ne", immediates: [], comment: "sign-agnostic compare unequal" };
    opcodes[0x48] = { name: "i32.lt_s", immediates: [], comment: "signed less than" };
    opcodes[0x49] = { name: "i32.lt_u", immediates: [], comment: "unsigned less than" };
    opcodes[0x4a] = { name: "i32.gt_s", immediates: [], comment: "signed greater than" };
    opcodes[0x4b] = { name: "i32.gt_u", immediates: [], comment: "unsigned greater than" };
    opcodes[0x4c] = { name: "i32.le_s", immediates: [], comment: "signed less than or equal" };
    opcodes[0x4d] = { name: "i32.le_u", immediates: [], comment: "unsigned less than" };
    opcodes[0x4e] = { name: "i32.ge_s", immediates: [], comment: "signed greater than or equal" };
    opcodes[0x4f] = { name: "i32.ge_u", immediates: [], comment: "unsigned greater than or equal" };
    opcodes[0x50] = { name: "i64.eqz", immediates: [], comment: "compare equal to zero (return 1 if operand is zero, 0 otherwise)" };
    opcodes[0x51] = { name: "i64.eq", immediates: [], comment: "sign-agnostic compare equal" };
    opcodes[0x52] = { name: "i64.ne", immediates: [], comment: "sign-agnostic compare unequal" };
    opcodes[0x53] = { name: "i64.lt_s", immediates: [], comment: "signed less than" };
    opcodes[0x54] = { name: "i64.lt_u", immediates: [], comment: "unsigned less than" };
    opcodes[0x55] = { name: "i64.gt_s", immediates: [], comment: "signed greater than" };
    opcodes[0x56] = { name: "i64.gt_u", immediates: [], comment: "unsigned greater than" };
    opcodes[0x57] = { name: "i64.le_s", immediates: [], comment: "signed less than or equal" };
    opcodes[0x58] = { name: "i64.le_u", immediates: [], comment: "unsigned less than" };
    opcodes[0x59] = { name: "i64.ge_s", immediates: [], comment: "signed greater than or equal" };
    opcodes[0x5a] = { name: "i64.ge_u", immediates: [], comment: "unsigned greater than or equal" };
    opcodes[0x5b] = { name: "f32.eq", immediates: [], comment: "compare ordered and equal" };
    opcodes[0x5c] = { name: "f32.ne", immediates: [], comment: "compare unordered or unequal" };
    opcodes[0x5d] = { name: "f32.lt", immediates: [], comment: "compare ordered and less than" };
    opcodes[0x5e] = { name: "f32.gt", immediates: [], comment: "compare ordered and greater than" };
    opcodes[0x5f] = { name: "f32.le", immediates: [], comment: "compare ordered and less than or equal" };
    opcodes[0x60] = { name: "f32.ge", immediates: [], comment: "compare ordered and greater than or equal" };
    opcodes[0x61] = { name: "f64.eq", immediates: [], comment: "compare ordered and equal" };
    opcodes[0x62] = { name: "f64.ne", immediates: [], comment: "compare unordered or unequal" };
    opcodes[0x63] = { name: "f64.lt", immediates: [], comment: "compare ordered and less than" };
    opcodes[0x64] = { name: "f64.gt", immediates: [], comment: "compare ordered and greater than" };
    opcodes[0x65] = { name: "f64.le", immediates: [], comment: "compare ordered and less than or equal" };
    opcodes[0x66] = { name: "f64.ge", immediates: [], comment: "compare ordered and greater than or equal" };
    opcodes[0x67] = { name: "i32.clz", immediates: [], comment: "sign-agnostic count leading zero bits (All zero bits are considered leading if the value is zero)" };
    opcodes[0x68] = { name: "i32.ctz", immediates: [], comment: "sign-agnostic count trailing zero bits (All zero bits are considered trailing if the value is zero)" };
    opcodes[0x69] = { name: "i32.popcnt", immediates: [], comment: "sign-agnostic count number of one bits" };
    opcodes[0x6a] = { name: "i32.add", immediates: [], comment: "sign-agnostic addition" };
    opcodes[0x6b] = { name: "i32.sub", immediates: [], comment: "sign-agnostic subtraction" };
    opcodes[0x6c] = { name: "i32.mul", immediates: [], comment: "sign-agnostic multiplication (lower 32-bits)" };
    opcodes[0x6d] = { name: "i32.div_s", immediates: [], comment: "signed division (result is truncated toward zero)" };
    opcodes[0x6e] = { name: "i32.div_u", immediates: [], comment: "unsigned division (result is floored)" };
    opcodes[0x6f] = { name: "i32.rem_s", immediates: [], comment: "signed remainder (result has the sign of the dividend)" };
    opcodes[0x70] = { name: "i32.rem_u", immediates: [], comment: "unsigned remainder" };
    opcodes[0x71] = { name: "i32.and", immediates: [], comment: "sign-agnostic bitwise and" };
    opcodes[0x72] = { name: "i32.or", immediates: [], comment: "sign-agnostic bitwise inclusive or" };
    opcodes[0x73] = { name: "i32.xor", immediates: [], comment: "sign-agnostic bitwise exclusive or" };
    opcodes[0x74] = { name: "i32.shl", immediates: [], comment: "sign-agnostic shift left" };
    opcodes[0x75] = { name: "i32.shr_s", immediates: [], comment: "zero-replicating (logical) shift right" };
    opcodes[0x76] = { name: "i32.shr_u", immediates: [], comment: "sign-replicating (arithmetic) shift right" };
    opcodes[0x77] = { name: "i32.rotl", immediates: [], comment: "sign-agnostic rotate left" };
    opcodes[0x78] = { name: "i32.rotr", immediates: [], comment: "sign-agnostic rotate right" };
    opcodes[0x79] = { name: "i64.clz", immediates: [], comment: "sign-agnostic count leading zero bits (All zero bits are considered leading if the value is zero)" };
    opcodes[0x7a] = { name: "i64.ctz", immediates: [], comment: "sign-agnostic count trailing zero bits (All zero bits are considered trailing if the value is zero)" };
    opcodes[0x7b] = { name: "i64.popcnt", immediates: [], comment: "sign-agnostic count number of one bits" };
    opcodes[0x7c] = { name: "i64.add", immediates: [], comment: "sign-agnostic addition" };
    opcodes[0x7d] = { name: "i64.sub", immediates: [], comment: "sign-agnostic subtraction" };
    opcodes[0x7e] = { name: "i64.mul", immediates: [], comment: "sign-agnostic multiplication (lower 32-bits)" };
    opcodes[0x7f] = { name: "i64.div_s", immediates: [], comment: "signed division (result is truncated toward zero)" };
    opcodes[0x80] = { name: "i64.div_u", immediates: [], comment: "unsigned division (result is floored)" };
    opcodes[0x81] = { name: "i64.rem_s", immediates: [], comment: "signed remainder (result has the sign of the dividend)" };
    opcodes[0x82] = { name: "i64.rem_u", immediates: [], comment: "unsigned remainder" };
    opcodes[0x83] = { name: "i64.and", immediates: [], comment: "sign-agnostic bitwise and" };
    opcodes[0x84] = { name: "i64.or", immediates: [], comment: "sign-agnostic bitwise inclusive or" };
    opcodes[0x85] = { name: "i64.xor", immediates: [], comment: "sign-agnostic bitwise exclusive or" };
    opcodes[0x86] = { name: "i64.shl", immediates: [], comment: "sign-agnostic shift left" };
    opcodes[0x87] = { name: "i64.shr_s", immediates: [], comment: "zero-replicating (logical) shift right" };
    opcodes[0x88] = { name: "i64.shr_u", immediates: [], comment: "sign-replicating (arithmetic) shift right" };
    opcodes[0x89] = { name: "i64.rotl", immediates: [], comment: "sign-agnostic rotate left" };
    opcodes[0x8a] = { name: "i64.rotr", immediates: [], comment: "sign-agnostic rotate right" };
    opcodes[0x8b] = { name: "f32.abs", immediates: [], comment: "absolute value" };
    opcodes[0x8c] = { name: "f32.neg", immediates: [], comment: "negation" };
    opcodes[0x8d] = { name: "f32.ceil", immediates: [], comment: "ceiling operator" };
    opcodes[0x8e] = { name: "f32.floor", immediates: [], comment: "floor operator" };
    opcodes[0x8f] = { name: "f32.trunc", immediates: [], comment: "round to nearest integer towards zero" };
    opcodes[0x90] = { name: "f32.nearest", immediates: [], comment: "round to nearest integer, ties to even" };
    opcodes[0x91] = { name: "f32.sqrt", immediates: [], comment: "square root" };
    opcodes[0x92] = { name: "f32.add", immediates: [], comment: "addition" };
    opcodes[0x93] = { name: "f32.sub", immediates: [], comment: "subtraction" };
    opcodes[0x94] = { name: "f32.mul", immediates: [], comment: "multiplication" };
    opcodes[0x95] = { name: "f32.div", immediates: [], comment: "division" };
    opcodes[0x96] = { name: "f32.min", immediates: [], comment: "minimum (binary operator}, if either operand is NaN, returns NaN" };
    opcodes[0x97] = { name: "f32.max", immediates: [], comment: "maximum (binary operator}, if either operand is NaN, returns NaN" };
    opcodes[0x98] = { name: "f32.copysign", immediates: [], comment: "copysign" };
    opcodes[0x99] = { name: "f64.abs", immediates: [], comment: "absolute value" };
    opcodes[0x9a] = { name: "f64.neg", immediates: [], comment: "negation" };
    opcodes[0x9b] = { name: "f64.ceil", immediates: [], comment: "ceiling operator" };
    opcodes[0x9c] = { name: "f64.floor", immediates: [], comment: "floor operator" };
    opcodes[0x9d] = { name: "f64.trunc", immediates: [], comment: "round to nearest integer towards zero" };
    opcodes[0x9e] = { name: "f64.nearest", immediates: [], comment: "round to nearest integer, ties to even" };
    opcodes[0x9f] = { name: "f64.sqrt", immediates: [], comment: "square root" };
    opcodes[0xa0] = { name: "f64.add", immediates: [], comment: "addition" };
    opcodes[0xa1] = { name: "f64.sub", immediates: [], comment: "subtraction" };
    opcodes[0xa2] = { name: "f64.mul", immediates: [], comment: "multiplication" };
    opcodes[0xa3] = { name: "f64.div", immediates: [], comment: "division" };
    opcodes[0xa4] = { name: "f64.min", immediates: [], comment: "minimum (binary operator}, if either operand is NaN, returns NaN" };
    opcodes[0xa5] = { name: "f64.max", immediates: [], comment: "maximum (binary operator}, if either operand is NaN, returns NaN" };
    opcodes[0xa6] = { name: "f64.copysign", immediates: [], comment: "copysign" };
    opcodes[0xa7] = { name: "i32.wrap/i64", immediates: [], comment: "wrap a 64-bit integer to a 32-bit integer" };
    opcodes[0xa8] = { name: "i32.trunc_s/f32", immediates: [], comment: "truncate a 32-bit float to a signed 32-bit integer" };
    opcodes[0xa9] = { name: "i32.trunc_u/f32", immediates: [], comment: "truncate a 32-bit float to an unsigned 32-bit integer" };
    opcodes[0xaa] = { name: "i32.trunc_s/f64", immediates: [], comment: "truncate a 64-bit float to a signed 32-bit integer" };
    opcodes[0xab] = { name: "i32.trunc_u/f64", immediates: [], comment: "truncate a 64-bit float to an unsigned 32-bit integer" };
    opcodes[0xac] = { name: "i64.extend_s/i32", immediates: [], comment: "extend a signed 32-bit integer to a 64-bit integer" };
    opcodes[0xad] = { name: "i64.extend_u/i32", immediates: [], comment: "extend an unsigned 32-bit integer to a 64-bit integer" };
    opcodes[0xae] = { name: "i64.trunc_s/f32", immediates: [], comment: "truncate a 32-bit float to a signed 64-bit integer" };
    opcodes[0xaf] = { name: "i64.trunc_u/f32", immediates: [], comment: "truncate a 32-bit float to an unsigned 64-bit integer" };
    opcodes[0xb0] = { name: "i64.trunc_s/f64", immediates: [], comment: "truncate a 64-bit float to a signed 64-bit integer" };
    opcodes[0xb1] = { name: "i64.trunc_u/f64", immediates: [], comment: "truncate a 64-bit float to an unsigned 64-bit integer" };
    opcodes[0xb2] = { name: "f32.convert_s/i32", immediates: [], comment: "convert a signed 32-bit integer to a 32-bit float" };
    opcodes[0xb3] = { name: "f32.convert_u/i32", immediates: [], comment: "convert an unsigned 32-bit integer to a 32-bit float" };
    opcodes[0xb4] = { name: "f32.convert_s/i64", immediates: [], comment: "convert a signed 64-bit integer to a 32-bit float" };
    opcodes[0xb5] = { name: "f32.convert_u/i64", immediates: [], comment: "convert an unsigned 64-bit integer to a 32-bit float" };
    opcodes[0xb6] = { name: "f32.demote/f64", immediates: [], comment: "demote a 64-bit float to a 32-bit float" };
    opcodes[0xb7] = { name: "f64.convert_s/i32", immediates: [], comment: "convert a signed 32-bit integer to a 64-bit float" };
    opcodes[0xb8] = { name: "f64.convert_u/i32", immediates: [], comment: "convert an unsigned 32-bit integer to a 64-bit float" };
    opcodes[0xb9] = { name: "f64.convert_s/i64", immediates: [], comment: "convert a signed 64-bit integer to a 64-bit float" };
    opcodes[0xba] = { name: "f64.convert_u/i64", immediates: [], comment: "convert an unsigned 64-bit integer to a 64-bit float" };
    opcodes[0xbb] = { name: "f64.promote/f32", immediates: [], comment: "promote a 32-bit float to a 64-bit float" };
    opcodes[0xbc] = { name: "i32.reinterpret/f32", immediates: [], comment: "reinterpret the bits of a 32-bit float as a 32-bit integer" };
    opcodes[0xbd] = { name: "i64.reinterpret/f64", immediates: [], comment: "reinterpret the bits of a 64-bit float as a 64-bit integer" };
    opcodes[0xbe] = { name: "f32.reinterpret/i32", immediates: [], comment: "reinterpret the bits of a 32-bit integer as a 32-bit float" };
    opcodes[0xbf] = { name: "f64.reinterpret/i64", immediates: [], comment: "reinterpret the bits of a 64-bit integer as a 64-bit float" };

    /** Returns the signature of the given opcode. */
    function getOpcodeInfo(op: opcode) {
        const info = opcodes[op];
        Debug.assert(info !== undefined, "Unrecognized opcode.", () => `opcode: '${op}'`);
        return info;
    }

    /**
     * Disassembler for wasm modules, suitable for producing human readable baselines for TypeScript
     * compiler tests that use '--target=wasm'.
     */
    export class Disassembler {
        /** Decoder for the module currently being disassembled. */
        private decoder: Decoder;

        /** Text writer used to build the result of 'getText()'. */
        private writer: EmitTextWriter;

        /** Retained reference to the type section, used to  print function signatures while
            dumping the code section. */
        private types: TypeSection;

        /** Retained reference to the function section, used to lookup function signatures while
            dumping the code section. */
        private functions: FunctionSection;

        /** Retained reference to the Export section, used to print export names (if any) while
            dumping the code section. */
        private exports: ExportSection;

        /** Marks the last offset in the module dumped by the 'decoded()' helper. */
        private decodedMark: number = 0;

        /** Creates a new Disassembler instance for the give wasm module.  'newLine' should be
            either "\n" or "\r\n" as specified by the host environment. */
        private constructor(private module: number[], newLine: string) {
            this.decoder = new Decoder(module);
            this.writer = createTextWriter(newLine);
        }

        /** Disassembles the given wasm 'module' and returns the result.  'newLine' should be
            either "\n" or "\r\n" as specified by the host environment. */
        public static getText(module: number[], newLine: string) {
            const self = new Disassembler(module, newLine);
            self.bytes(self.module, 0, self.module.length);
            self.writer.writeLine();

            self.module_preamble();
            self.writer.increaseIndent();
            self.decoded();
            self.writer.decreaseIndent();

            while(self.section());
            return self.writer.getText();
        }

        /** Write the given string without a newline. */
        private write(s: string) {
            this.writer.write(s);
        }

        /** Write the given string (if any), followed by a newline. */
        private writeLine(s?: string) {
            if (s !== undefined) {
                this.writer.write(s);
            }
            this.writer.writeLine();
        }

        /** Increase the current indentation level. */
        private indent() {
            this.writer.increaseIndent();
        }

        /** Decrease the current indentation level. */
        private unindent() {
            this.writer.decreaseIndent();
        }

        /** Writes spaces, stopping at the designated column.  Used for aligning comments at a given stop, etc. */
        private writePadding(column: number) {
            for (let i = column - this.writer.getColumn(); i > 0; i--) {
                this.writer.write(" ");
            }
        }

        /** Pretty print the given 'bytes' array, starting at the specified 'offset', formatted as
            lines of 16 hexadecimal bytes.  If 'showOffsets' is true, prints the hex offset at the
            beginning of each line. */
        private bytes(bytes: number[], start: number, end: number) {
            const bytesPerLine = 16;

            // For each line of output, beginning at 'offset'...
            for (let offset = start; offset < end; offset += bytesPerLine) {
                this.write(`${hex32(offset)}: `);                           // Print the starting offset

                const currentLine = bytes
                    .slice(offset, Math.min(offset + bytesPerLine, end))    // For each group of up to 16 bytes
                    .map(byte => hex8(byte))                                //   Format as hexadecimal
                    .join(" ");                                             //   Add spaces between each byte

                this.writeLine(currentLine);                                // print the current line
            }
        }

        /** Prints the bytes of the wasm module currently being disassembled, beginning at the last offset
            at which 'decoded()' was last invoked, up to the current offset of the decoder.

            Generally called shortly after invoking any methods on 'this.decoder()' to show the bytes
            associated with the section being dumped. */
        private decoded() {
            this.bytes(this.module, this.decodedMark, this.decoder.offset);
            this.decodedMark = this.decoder.offset;
        }

        // private type(type: type) {
        //     Debug.fail(`Not Implemented: Unknown value_type '${type}'.`);
        // }

        /** Returns the given 'value_type' as a string. */
        private value_type(type: value_type) {
            switch (type) {
                case value_type.f32:
                    return "f32";
                case value_type.f64:
                    return "f64";
                case value_type.i32:
                    return "i32";
                case value_type.i64:
                    return "i64";
            }

            Debug.fail(`Unknown value_type '${type}'.`);
        }

        /** Returns the given 'func_type' as a string. */
        private func_type(signature: FuncType) {
            const params = signature.param_types
                .map(type => this.value_type(type))
                .join(",")

            const returns = signature.return_types.length > 0
                ? signature.return_types.map(type => this.value_type(type)).join(",")
                : "void";

            return `(${params}) => ${returns}`;
        }

        // Other Types

        /** Returns the given 'external_kind' as a string. */
        private external_kind(kind: external_kind) {
            switch (kind) {
                case external_kind.Function:
                    return "function";
                case external_kind.Global:
                    return "global";
                case external_kind.Memory:
                    return "memory";
                case external_kind.Table:
                    return "table";
            }

            Debug.fail(`Unsupported external_kind '${kind}'.`);
        }

        // Module Structure

        /** Decodes and prints the module preamble. */
        private module_preamble() {
            const preamble = this.decoder.module_preamble();
            this.writeLine(`module version ${preamble.version}`);
            this.indent();
            this.decoded();
            this.unindent();
        }

        /** Called by 'section' to print the given 'section' name/id and decoded bytes, then
            invokes the given 'handler' to finish dumping the section data. */
        private section_helper<T extends Section>(name: string, section: T, handler: (section: T) => void) {
            this.writeLine(`${name} (id=${section.id})`);
            this.indent();
            this.decoded();
            handler(section);
            this.unindent();
        }

        /** Decodes and prints the next section in the wasm module.  Returns 'true' if more sections
            remain to process. */
        private section() {
            // Permit 'section()' to be called with no bytes remaining, as the minimum valid wasm module
            // contains just a preamble and 0 sections.
            if (this.decoder.remaining === 0) {
                return false;
            }

            // If there are bytes remaining, there must be a section.  Decode it.
            const section = this.decoder.section();

            // Identify the kind of section and invoke the appropriate helpers to print it.
            switch (section.id) {
                case section_code.Custom:
                    this.section_helper("Custom Section", <CustomSection> section, this.custom_section.bind(this));
                    break;

                case section_code.Type:
                    this.types = <TypeSection> section;
                    this.section_helper("Type Section", this.types, this.type_section.bind(this));
                    break;

                case section_code.Function:
                    this.functions = <FunctionSection> section;
                    this.section_helper("Function Section", this.functions, this.function_section.bind(this));
                    break;

                case section_code.Export:
                    this.exports = <ExportSection> section;
                    this.section_helper("Export Section", this.exports, this.export_section.bind(this));
                    break;

                case section_code.Code:
                    this.section_helper("Code Section", <CodeSection> section, this.code_section.bind(this));
                    break;

                default:
                    Debug.fail(`Not Implemented: Unsupported section id '${section.id}'.`);
            }

            // Return 'true' if unprocessed bytes remain.
            return this.decoder.remaining !== 0;
        }

        /** Called by 'section()' to print the payload of a CustomSection. */
        private custom_section(custom: CustomSection) {
            this.writeLine(`${custom.name} = {`);
            this.indent();
            this.bytes(custom.payload_data, 0, custom.payload_data.length);
            this.unindent();
            this.writeLine(`}`);
        }

        /** Called by 'section()' to print the payload of a TypeSection. */
        private type_section(types: TypeSection) {
            types.entries.forEach((entry, index) => {
                this.writeLine(`[${index}] func_type: ${this.func_type(entry)}`);
            });
        }

        /** Called by 'section()' to print the payload of a FunctionSection. */
        private function_section(functions: FunctionSection) {
            functions.types.forEach((type, index) => {
                this.writeLine(`[${index}] ${type}`);
            });
        }

        /** Called by 'section()' to print the payload of an ExportSection. */
        private export_section(exports: ExportSection) {
            exports.entries.forEach((entry, index) => {
                this.writeLine(`[${index}] ${this.export_entry(entry)}`);
            });
        }

        /** Returns the string representing the given 'entry'. */
        private export_entry(entry: ExportEntry) {
            return `'${entry.name}' ${this.external_kind(entry.kind)} index: ${entry.index}`;
        }

        /** Called by 'section()' to print the payload of a CodeSection. */
        private code_section(code: CodeSection) {
            code.bodies.forEach((body, index) => {
                this.write(`[${index}] `);
                this.function_body(index, body);
            });
        }

        // Function Bodies

        /** Called by 'code_section()' to print each function_body. */
        private function_body(index: number, body: FunctionBody) {
            // Note: Per spec, the exports section may be elided if there are no exports from the module.
            //       However, if exports exist, the exports section must precede the code section.
            const exports = this.exports !== undefined
                ? this.exports.entries.filter(entry => entry.index === index)
                : [];

            // Print all exports for this function (if any).
            exports.forEach((exportEntry, index) => {
                // If more than one export, separate with new lines.
                if (index > 0) {
                    this.writeLine("...");
                }

                this.write(`export ${this.external_kind(exportEntry.kind)} '${exportEntry.name}': `);
            });

            // Get the function's signature from the type section and print it.
            const type = this.types.entries[this.functions.types[index]];
            this.writeLine(this.func_type(type));
            this.indent();

            // Print the function's locals.
            let localIndex = 0;

            this.writeLine("params:")
            this.indent();

            // Each parameter is an implicit local, beginning at index zero.
            type.param_types.forEach(param => {
                this.writeLine(`\$${localIndex++}: ${this.value_type(param)}`);
            });

            this.unindent();

            this.writeLine("locals:")
            this.indent();

            // Body locals begin at the index following the last parameter.
            body.locals.forEach(local => {
                for (let i = 0; i < local.count; i++) {
                    this.writeLine(`\$${localIndex++}: ${this.value_type(local.type)}`);
                }
            });

            this.unindent();

            // Disassemble the body's byte code.
            this.writeLine("code:")
            this.indent();
            this.code(body.code);
            this.unindent();
            this.unindent();
        }

        /** Called by 'function_body' to print the function's byte code. */
        private code(code: number[]) {
            const decoder = new Decoder(code);

            while (decoder.remaining > 0) {                     // While there are remaining opcodes.
                const opInfo = getOpcodeInfo(decoder.op());     //   Decode the next opcode.
                this.write(opInfo.name);                        //   Write the opcode's name.

                const immediates = opInfo.immediates.map(       //   Decode any immediates.
                    immediate => {
                        switch (immediate) {
                            case "local_index : varuint32":
                                return `\$${decoder.varuint32()}`
                            default:
                                Debug.fail(`Not Implemented: Unsupported opcode immediate kind '${immediate}'`);
                                break;
                        }
                    }).join(" ");                               // Join immediates with a space.

                this.write(` ${immediates}`);                   // Write the immediates (if any).
                this.writePadding(30);                          // Pad to column 30.
                this.writeLine(`// ${opInfo.comment}`);         // Print the comment describing the opcode.
            }
        }
    }
}