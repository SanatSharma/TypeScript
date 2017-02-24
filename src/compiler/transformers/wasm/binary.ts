/**
 * Functions and types related to the WebAssembly binary representation, shared by
 * 'Encoder.ts' and 'Decoder.ts'.
 */

/* @internal */
namespace ts.wasm {
    /** Return the given number as a 2-digit hexidecimal string. */
    export function hex2(value: number) {
        Debug.assert(is_int32(value) || is_uint32(value),
            "'value' must be an 8b signed or unsigned integer.", () => `got '${value}'`);
        const hex = value.toString(16);
        return "00".substr(-2 + hex.length) + hex;
    }

    /** Return the given number as an 8-digit hexidecimal string. */
    export function hex8(value: number) {
        Debug.assert(is_int32(value) || is_uint32(value),
            "'value' must be a 32b signed or unsigned integer.", () => `got '${value}'`);
        const hex = value.toString(16);
        return "00000000".substr(-8 + hex.length) + hex;
    }

    // Data Types

    /** True if the given number is an integer in the [0..1] range. */
    function is_uint1(value: number) {
        return (value & 0x01) === value;
    }

    /** Asserts that the given number is an integer in the valid uint1 range. */
    export function assert_is_uint1(value: number) {
        Debug.assert(is_uint1(value), "'value' must be a uint1.", () => `got '${value}'`);
    }

    /** True if the given number is an integer in the [0..127] range. */
    function is_uint7(value: number) {
        return (value & 0x7F) === value;
    }

    /** Asserts that the given number is an integer in the valid uint7 range. */
    export function assert_is_uint7(value: number) {
        Debug.assert(is_uint7(value), "'value' must be a uint7.", () => `got '${value}'`);
    }

    /** True if the given number is an integer in the [-64..63] range. */
    function is_int7(value: number) {
        return -0x40 <= value && value <= 0x3F;
    }

    /** Asserts that the given number is an integer in the valid int7 range. */
    export function assert_is_int7(value: number) {
        Debug.assert(is_int7(value), "'value' must be a int7.", () => `got '${value}'`);
    }

    /** True if the given number is an integer in the [0..255] range. */
    function is_uint8(value: number) {
        return (value & 0xFF) === value;
    }

    /** Asserts that the given number is an integer in the valid uint8 range. */
    export function assert_is_uint8(value: number) {
        Debug.assert(is_uint8(value), "'value' must be a uint8.", () => `got '${value}'`);
    }

    /** True if the given number is an integer in the [-2147483648..2147483647] range. */
    function is_int32(value: number) {
        return (value | 0) === value;       // JavaScript idiom to coerce number to signed 32b.
    }

    /** Asserts that the given number is an integer in the valid int32 range. */
    export function assert_is_int32(value: number) {
        Debug.assert(is_int32(value), "'value' must be a int32.", () => `got '${value}'`);
    }

    /** True if the given number is an integer in the [0..4294967295] range. */
    export function is_uint32(value: number) {
        return (value >>> 0) === value;     // JavaScript idiom to coerce number to unsigned 32b.
    }

    /** Asserts that the given number is an integer in the valid uint32 range. */
    export function assert_is_uint32(value: number) {
        Debug.assert(is_uint32(value), "'value' must be a uint32.", () => `got '${value}'`);
    }

    /** Wrapper around Debug.assert() to provide a helper assertion message for invalid enum values.
        'name' is the name of the enum type.  'predicate' is the function used to test the validity
        of the 'value'. */
    function assert_valid_enum_value<T>(name: string, predicate: (value: T) => boolean, value: T) {
        Debug.assert(predicate(value),
            "'value' must be a valid member of the enumeration.", () => `'${value}' is not a member of ${name}.`);
    }

    // Language Types

    /** All types are distinguished by a negative varint7 values that is the first
        byte of their encoding (representing a type constructor). */
    export enum type {
        i32 = -0x01,
        i64 = -0x02,
        f32 = -0x03,
        f64 = -0x04,
        anyfunc = -0x10,
        func = -0x20,
        emptyBlock = -0x40,
    }

    /** True if the given number is a valid value in the 'type' enum. */
    export function is_type(value: number) {
        switch (value) {
            case type.anyfunc:
            case type.func:
            case type.emptyBlock:
                return true;
            default:
                // All remaining 'type' values are members of the 'value_type' subset.
                return is_value_type(value);
        }
    }

    /** Casts the given number to a type, asserting it is a valid enum value. */
    export function to_type(value: number) {
        assert_valid_enum_value("type", is_type, value);
        return <type>value;
    }

    /** A varint7 indicating a value type. */
    export enum value_type {
        i32 = type.i32,
        i64 = type.i64,
        f32 = type.f32,
        f64 = type.f64,
    }

    /** True if the given number is a valid value in the 'value_type' enum. */
    export function is_value_type(value: number) {
        // Valid 'value_type' values are consecutive in the [-4..-1] range.
        return value_type.f64 <= value && value <= value_type.i32;
    }

    /** Casts the given number to a value_type, asserting it is a valid enum value. */
    export function to_value_type(value: number) {
        assert_valid_enum_value("value_type", is_value_type, value);
        return <value_type>value;
    }

    /** The description of a function signature. */
    export class FuncType {
        constructor (readonly param_types: value_type[], readonly return_types: value_type[]) {
            // Note: In the future, return_count and return_type might be generalised to allow multiple values.
            Debug.assert(0 <= return_types.length && return_types.length <= 1,
                "'func_type' must have 0 or 1 return values.", () => `got '${return_types.length}'`);
        }
    }

    // Other Types

    /** A single-byte unsigned integer indicating the kind of definition being imported or defined. */
    export enum external_kind {
        Function = 0,   // indicating a Function import or definition
        Table = 1,      // indicating a Table import or definition
        Memory = 2,     // indicating a Memory import or definition
        Global = 3,     // indicating a Global import or definition
    }

    /** True if the given number is a valid value in the 'value_type' enum. */
    export function is_external_kind(value: number) {
        // Valid 'external_kind' values are consecutive in the [0..3] range.
        return external_kind.Function <= value && value <= external_kind.Global;
    }

    /** Casts the given number to an external_kind, asserting it is a valid enum value. */
    export function to_external_kind(value: number) {
        assert_valid_enum_value("external_kind", is_external_kind, value);
        return <external_kind>value;
    }

    // Module Structure

    /** The module starts with a preamble  */
    export class Preamble {
        readonly magic_number = 0x6d736100;             // Magic number (i.e., '\0asm')

        constructor (readonly version: number) {
            switch (this.version) {
                case 0x0d:      // Currently 0xd. The version for MVP will be reset to 1.
                    break;
                default:
                    Debug.fail(`Unsupported version in module preamble: '${version}'`);
                    break;
            }
        }
    }

    /** Each section [in a WebAssembly module] is identified by a 1-byte section code that encodes either
        a known section or a custom section. */
    export enum section_code {
        Custom = 0,     // Custom
        Type = 1,       // Function signature declarations
        Import = 2,     // Import declarations
        Function = 3,   // Function declarations
        Table = 4,      // Indirect function table and other tables
        Memory = 5,     // Memory attributes
        Global = 6,     // Global declarations
        Export = 7,     // Exports
        Start = 8,      // Start function declaration
        Element = 9,    // Elements section
        Code = 10,      // Function bodies (code)
        Data = 11,      // Data segments
    }

    /** True if the given number is a valid value in the 'section_code' enum. */
    export function is_section_code(value: number) {
        // Valid 'section_code' values are consecutive in the [0..11] range.
        return section_code.Custom <= value && value <= section_code.Data;
    }

    /** Casts the given number to a section_code, asserting it is a valid enum value. */
    export function to_section_code(value: number) {
        assert_valid_enum_value("section_code", is_section_code, value);
        return <section_code>value;
    }
    /** Base class for WebAssembly module sections */
    export class Section {
        constructor (readonly id: section_code) { }
    }

    /** Custom sections are ignored by the WebAssembly implementation, and thus validation
        errors within them do not invalidate a module.

        Custom sections all have the same id, and can be named non-uniquely (all bytes composing
        their names can be identical). */
    export class CustomSection extends Section {
        constructor (readonly name: number[], readonly payload_data: number[]) {
            super(section_code.Custom);
        }
    }

    /** The type section declares all function signatures that will be used in the module. */
    export class TypeSection extends Section {
        readonly entries: FuncType[] = [];

        constructor () { super(section_code.Type); }

        public add(signature: FuncType) {
            const index = this.entries.length;
            this.entries.push(signature);
            return index;
        }
    }
    /** The function section declares the signatures of all functions in the module (their
        definitions appear in the code section). */
    export class FunctionSection extends Section {
        readonly types: number[] = [];      // varuint32*   sequence of indices into the type section

        constructor () { super(section_code.Function); }

        /** @param index Index of signature in types section */
        public add(index: number) {
            assert_is_uint32(index);
            const functionIndex = this.types.length;
            this.types.push(index);
            return functionIndex;
        }
    }

    /** Each export has three fields: a name, whose meaning is defined by the host environment, a type,
        indicating whether the export is a function, global, memory or table, and an index into the
        type’s corresponding index space. */
    export class ExportEntry {
        readonly kind: external_kind;

        /** For example, if the “kind” is Function, then “index” is a function index. */
        constructor (readonly name: string, kind: external_kind, readonly index: number) {
            assert_is_uint32(index);
            this.kind = to_external_kind(kind);     // Assert that 'kind' is a valid enum value.
            Debug.assert(index === 0 || kind !== external_kind.Global && kind !== external_kind.Memory,
                "In the MVP, the only valid index value for a memory or table export is 0.");
        }
    }

    /** A sequence of exports which are returned at instantiation time to the host environment. */
    export class ExportSection extends Section {
        readonly entries: ExportEntry[] = [];

        constructor () { super(section_code.Export); }

        public add(entry: ExportEntry) {
            this.entries.push(entry);
        }
    }

    /** The code section contains a body for every function in the module. The count of functions
        declared in the function section and function bodies defined in this section must be the
        same and the ith declaration corresponds to the ith function body. */
    export class CodeSection extends Section {
        readonly bodies: FunctionBody[] = [];       // function_body*   sequence of Function Bodies

        constructor () { super(section_code.Code); }

        public add(body: FunctionBody) {
            this.bodies.push(body);
        }
    }

    // Function Bodies

    /** Function bodies consist of a sequence of local variable declarations followed by bytecode instructions.
        It is legal to have several local entries with the same type.  Each function body must end with the end
        opcode. */
    export class FunctionBody {
        constructor (readonly locals: LocalEntry[], readonly code: number[]) {
            Debug.assert(code.length > 0,
                "'code' must terminate with the 'end' opcode (0x0b).  got zero bytes.");
            Debug.assert(code[code.length - 1] === opcode.end,
                "'code' must terminate with the 'end' opcode (0x0b).", () => `got '0x${hex2(code[code.length - 1])}'`);
        }
    }

    /** Each local entry declares a number of local variables of a given type. */
    export class LocalEntry {
        readonly type: value_type;
        constructor (readonly count: number, type: value_type) {
            assert_is_uint32(count);
            this.type = to_value_type(type);    // Assert 'type' is a valid 'value_type'.
        }
    }

    export enum opcode {
        end             = 0x0b,     //                                  end a block, loop, or if
        return          = 0x0f,     //                                  return zero or one value from this function
    }
}