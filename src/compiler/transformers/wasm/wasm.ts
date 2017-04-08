/// <reference path="encoder.ts" />
/// <reference path="../../types.ts" />

/* @internal */
namespace ts.wasm {

    /** Root wasm emit node representing the wasm module. */
    export class WasmModule {
        constructor(readonly resolver: TypeChecker, readonly diagnostics: DiagnosticCollection) { }

        /** Emit the binary for this wasm module to the given encoder. */
        public emit(encoder: Encoder) {
            encoder.module_preamble(new Preamble(WasmVersion.Mvp));
        }
    }

    /** Emit a binary wasm module for the given 'sourceFiles' to the specified 'outFile'. */
    export function emit(resolver: TypeChecker, host: EmitHost, diagnostics: DiagnosticCollection, sourceFiles: SourceFile[], outFile: string) {
        const wasmModule = new WasmModule(resolver, diagnostics);

        // TODO: Visit source files
        sourceFiles.forEach(() => {
            // ...
        });

        // Wasm is implicitly 'noEmitOnError'.  Do not write the binary if any errors were encountered.
        if (diagnostics.getDiagnostics().length === 0) {
            const wasmEncoder = new Encoder();
            wasmModule.emit(wasmEncoder);
            host.writeFile(outFile, wasmEncoder.buffer, /* writeByteOrderMark: */ false);
        }
    }
}