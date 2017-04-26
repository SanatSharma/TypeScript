//// [wasm_numeric_literals.ts]

export function pi() { return 3.141592653589793; }

export function minimumExactInteger() { return -9007199254740992; }


//// [out.wasm]
00000000: 00 61 73 6d 01 00 00 00 01 09 02 60 00 01 7c 60
00000010: 00 01 7c 03 03 02 00 01 07 1c 02 02 70 69 00 00
00000020: 13 6d 69 6e 69 6d 75 6d 45 78 61 63 74 49 6e 74
00000030: 65 67 65 72 00 01 0a 1b 02 0c 00 44 18 2d 44 54
00000040: fb 21 09 40 0f 0b 0c 00 44 00 00 00 00 00 00 40
00000050: c3 0f 0b

module version 1
    00000000: 00 61 73 6d 01 00 00 00

Type Section (id=1)
    00000008: 01 09 02 60 00 01 7c 60 00 01 7c
    [0] func_type: () => f64
    [1] func_type: () => f64

Function Section (id=3)
    00000013: 03 03 02 00 01
    [0] type index: 0
    [1] type index: 1

Export Section (id=7)
    00000018: 07 1c 02 02 70 69 00 00 13 6d 69 6e 69 6d 75 6d
    00000028: 45 78 61 63 74 49 6e 74 65 67 65 72 00 01
    [0] 'pi' function index: 0
    [1] 'minimumExactInteger' function index: 1

Code Section (id=10)
    00000036: 0a 1b 02 0c 00 44 18 2d 44 54 fb 21 09 40 0f 0b
    00000046: 0c 00 44 00 00 00 00 00 00 40 c3 0f 0b
    [0] export function 'pi': () => f64
        params:
        locals:
        code:
            f64.const 0x400921fb54442d18    // a constant value interpreted as f64
            return                          // return zero or one value from this function
            end                             // end a block, loop, or if
    [1] export function 'minimumExactInteger': () => f64
        params:
        locals:
        code:
            f64.const 0xc340000000000000    // a constant value interpreted as f64
            return                          // return zero or one value from this function
            end                             // end a block, loop, or if

