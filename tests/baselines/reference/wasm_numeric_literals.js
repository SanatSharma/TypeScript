//// [wasm_numeric_literals.ts]

export function pi() { return 3.141592653589793; }


//// [out.wasm]
00000000: 00 61 73 6d 01 00 00 00 01 05 01 60 00 01 7c 03
00000010: 02 01 00 07 06 01 02 70 69 00 00 0a 0e 01 0c 00
00000020: 44 18 2d 44 54 fb 21 09 40 0f 0b

module version 1
    00000000: 00 61 73 6d 01 00 00 00

Type Section (id=1)
    00000008: 01 05 01 60 00 01 7c
    [0] func_type: () => f64

Function Section (id=3)
    0000000f: 03 02 01 00
    [0] type index: 0

Export Section (id=7)
    00000013: 07 06 01 02 70 69 00 00
    [0] 'pi' function index: 0

Code Section (id=10)
    0000001b: 0a 0e 01 0c 00 44 18 2d 44 54 fb 21 09 40 0f 0b
    [0] export function 'pi': () => f64
        params:
        locals:
        code:
            f64.const 0x400921fb54442d18    // a constant value interpreted as f64
            return                          // return zero or one value from this function
            end                             // end a block, loop, or if

