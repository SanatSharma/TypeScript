//// [wasm_function_params.ts]

export function f64_param(value: number) { return value; }


//// [out.wasm]
00000000: 00 61 73 6d 01 00 00 00 01 06 01 60 01 7c 01 7c
00000010: 03 02 01 00 07 0d 01 09 66 36 34 5f 70 61 72 61
00000020: 6d 00 00 0a 07 01 05 00 20 00 0f 0b

module version 1
    00000000: 00 61 73 6d 01 00 00 00

Type Section (id=1)
    00000008: 01 06 01 60 01 7c 01 7c
    [0] func_type: (f64) => f64

Function Section (id=3)
    00000010: 03 02 01 00
    [0] type index: 0

Export Section (id=7)
    00000014: 07 0d 01 09 66 36 34 5f 70 61 72 61 6d 00 00
    [0] 'f64_param' function index: 0

Code Section (id=10)
    00000023: 0a 07 01 05 00 20 00 0f 0b
    [0] export function 'f64_param': (f64) => f64
        params:
            $0: f64
        locals:
        code:
            get_local $0                    // read a local variable or parameter
            return                          // return zero or one value from this function
            end                             // end a block, loop, or if

