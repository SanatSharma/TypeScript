//// [wasm_numeric_operators.ts]

export function add(a: number, b: number) { return a + b; }
export function sub(a: number, b: number) { return a - b; }
export function mul(a: number, b: number) { return a * b; }
export function div(a: number, b: number) { return a / b; }
export function precedence_mul_before_add(a: number, b: number, c: number) { return a * b + c; }
export function precedence_add_after_mul(a: number, b: number, c: number) { return a + b * c; }
export function precedence_parens(a: number, b: number, c: number) { return (a + b) * c; }


//// [out.wasm]
00000000: 00 61 73 6d 01 00 00 00 01 2e 07 60 02 7c 7c 01
00000010: 7c 60 02 7c 7c 01 7c 60 02 7c 7c 01 7c 60 02 7c
00000020: 7c 01 7c 60 03 7c 7c 7c 01 7c 60 03 7c 7c 7c 01
00000030: 7c 60 03 7c 7c 7c 01 7c 03 08 07 00 01 02 03 04
00000040: 05 06 07 64 07 03 61 64 64 00 00 03 73 75 62 00
00000050: 01 03 6d 75 6c 00 02 03 64 69 76 00 03 19 70 72
00000060: 65 63 65 64 65 6e 63 65 5f 6d 75 6c 5f 62 65 66
00000070: 6f 72 65 5f 61 64 64 00 04 18 70 72 65 63 65 64
00000080: 65 6e 63 65 5f 61 64 64 5f 61 66 74 65 72 5f 6d
00000090: 75 6c 00 05 11 70 72 65 63 65 64 65 6e 63 65 5f
000000a0: 70 61 72 65 6e 73 00 06 0a 49 07 08 00 20 00 20
000000b0: 01 a0 0f 0b 08 00 20 00 20 01 a1 0f 0b 08 00 20
000000c0: 00 20 01 a2 0f 0b 08 00 20 00 20 01 a3 0f 0b 0b
000000d0: 00 20 00 20 01 a2 20 02 a0 0f 0b 0b 00 20 00 20
000000e0: 01 20 02 a2 a0 0f 0b 0b 00 20 00 20 01 a0 20 02
000000f0: a2 0f 0b

module version 1
    00000000: 00 61 73 6d 01 00 00 00

Type Section (id=1)
    00000008: 01 2e 07 60 02 7c 7c 01 7c 60 02 7c 7c 01 7c 60
    00000018: 02 7c 7c 01 7c 60 02 7c 7c 01 7c 60 03 7c 7c 7c
    00000028: 01 7c 60 03 7c 7c 7c 01 7c 60 03 7c 7c 7c 01 7c
    [0] func_type: (f64,f64) => f64
    [1] func_type: (f64,f64) => f64
    [2] func_type: (f64,f64) => f64
    [3] func_type: (f64,f64) => f64
    [4] func_type: (f64,f64,f64) => f64
    [5] func_type: (f64,f64,f64) => f64
    [6] func_type: (f64,f64,f64) => f64

Function Section (id=3)
    00000038: 03 08 07 00 01 02 03 04 05 06
    [0] type index: 0
    [1] type index: 1
    [2] type index: 2
    [3] type index: 3
    [4] type index: 4
    [5] type index: 5
    [6] type index: 6

Export Section (id=7)
    00000042: 07 64 07 03 61 64 64 00 00 03 73 75 62 00 01 03
    00000052: 6d 75 6c 00 02 03 64 69 76 00 03 19 70 72 65 63
    00000062: 65 64 65 6e 63 65 5f 6d 75 6c 5f 62 65 66 6f 72
    00000072: 65 5f 61 64 64 00 04 18 70 72 65 63 65 64 65 6e
    00000082: 63 65 5f 61 64 64 5f 61 66 74 65 72 5f 6d 75 6c
    00000092: 00 05 11 70 72 65 63 65 64 65 6e 63 65 5f 70 61
    000000a2: 72 65 6e 73 00 06
    [0] 'add' function index: 0
    [1] 'sub' function index: 1
    [2] 'mul' function index: 2
    [3] 'div' function index: 3
    [4] 'precedence_mul_before_add' function index: 4
    [5] 'precedence_add_after_mul' function index: 5
    [6] 'precedence_parens' function index: 6

Code Section (id=10)
    000000a8: 0a 49 07 08 00 20 00 20 01 a0 0f 0b 08 00 20 00
    000000b8: 20 01 a1 0f 0b 08 00 20 00 20 01 a2 0f 0b 08 00
    000000c8: 20 00 20 01 a3 0f 0b 0b 00 20 00 20 01 a2 20 02
    000000d8: a0 0f 0b 0b 00 20 00 20 01 20 02 a2 a0 0f 0b 0b
    000000e8: 00 20 00 20 01 a0 20 02 a2 0f 0b
    [0] export function 'add': (f64,f64) => f64
        params:
            $0: f64
            $1: f64
        locals:
        code:
            get_local $0                    // read a local variable or parameter
            get_local $1                    // read a local variable or parameter
            f64.add                         // addition
            return                          // return zero or one value from this function
            end                             // end a block, loop, or if
    [1] export function 'sub': (f64,f64) => f64
        params:
            $0: f64
            $1: f64
        locals:
        code:
            get_local $0                    // read a local variable or parameter
            get_local $1                    // read a local variable or parameter
            f64.sub                         // subtraction
            return                          // return zero or one value from this function
            end                             // end a block, loop, or if
    [2] export function 'mul': (f64,f64) => f64
        params:
            $0: f64
            $1: f64
        locals:
        code:
            get_local $0                    // read a local variable or parameter
            get_local $1                    // read a local variable or parameter
            f64.mul                         // multiplication
            return                          // return zero or one value from this function
            end                             // end a block, loop, or if
    [3] export function 'div': (f64,f64) => f64
        params:
            $0: f64
            $1: f64
        locals:
        code:
            get_local $0                    // read a local variable or parameter
            get_local $1                    // read a local variable or parameter
            f64.div                         // division
            return                          // return zero or one value from this function
            end                             // end a block, loop, or if
    [4] export function 'precedence_mul_before_add': (f64,f64,f64) => f64
        params:
            $0: f64
            $1: f64
            $2: f64
        locals:
        code:
            get_local $0                    // read a local variable or parameter
            get_local $1                    // read a local variable or parameter
            f64.mul                         // multiplication
            get_local $2                    // read a local variable or parameter
            f64.add                         // addition
            return                          // return zero or one value from this function
            end                             // end a block, loop, or if
    [5] export function 'precedence_add_after_mul': (f64,f64,f64) => f64
        params:
            $0: f64
            $1: f64
            $2: f64
        locals:
        code:
            get_local $0                    // read a local variable or parameter
            get_local $1                    // read a local variable or parameter
            get_local $2                    // read a local variable or parameter
            f64.mul                         // multiplication
            f64.add                         // addition
            return                          // return zero or one value from this function
            end                             // end a block, loop, or if
    [6] export function 'precedence_parens': (f64,f64,f64) => f64
        params:
            $0: f64
            $1: f64
            $2: f64
        locals:
        code:
            get_local $0                    // read a local variable or parameter
            get_local $1                    // read a local variable or parameter
            f64.add                         // addition
            get_local $2                    // read a local variable or parameter
            f64.mul                         // multiplication
            return                          // return zero or one value from this function
            end                             // end a block, loop, or if

