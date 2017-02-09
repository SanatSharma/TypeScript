/**
 * Functions and types related to the WebAssembly binary representation, shared by
 * 'Encoder.ts' and 'Decoder.ts'.
 */

/* @internal */
namespace ts.wasm {
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
    function is_uint32(value: number) {
        return (value >>> 0) === value;     // JavaScript idiom to coerce number to unsigned 32b.
    }

    /** Asserts that the given number is an integer in the valid uint32 range. */
    export function assert_is_uint32(value: number) {
        Debug.assert(is_uint32(value), "'value' must be a uint32.", () => `got '${value}'`);
    }
}