//// [wasm_function_export_nop.ts]

export function nop() { }


//// [out.wasm]
00000000: 00 61 73 6d 01 00 00 00 01 04 01 60 00 00 03 02
00000010: 01 00 07 07 01 03 6e 6f 70 00 00 0a 04 01 02 00
00000020: 0b
module version 1
    00000000: 00 61 73 6d 01 00 00 00
Type Section (id=1)
    00000008: 01 04 01 60 00 00
    [0] func_type: () => void
Function Section (id=3)
    0000000e: 03 02 01 00
    [0] type index: 0
Export Section (id=7)
    00000012: 07 07 01 03 6e 6f 70 00 00
    [0] 'nop' function index: 0
Code Section (id=10)
    0000001b: 0a 04 01 02 00 0b
    [0] export function 'nop': () => void
        params:
        locals:
        code:
            end              // end a block, loop, or if
