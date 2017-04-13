/// <reference path="encoder.ts" />
/// <reference path="../../types.ts" />

/* @internal */
namespace ts.wasm {
    /** Root wasm emit node representing the wasm module. */
    export class WasmModule {

        constructor(readonly resolver: TypeChecker, readonly diagnostics: DiagnosticCollection) { }

        public error(node: Node, message: DiagnosticMessage, ...args: (string | number)[]) {
            const sourceFile = getSourceFileOfNode(node);
            const span = getSpanOfTokenAtPosition(sourceFile, node.pos);
            this.diagnostics.add(createFileDiagnostic(sourceFile, span.start, span.length, message, ...args));
        }

        /** Emit the binary for the wasm module to the given encoder. */
        public emit(encoder: Encoder) {
            // Create the wasm module sections.
            const types = new TypeSection();
            const functions = new FunctionSection();
            const exports = new ExportSection();
            const code = new CodeSection();

            // Write the module preamble that contains the magic number and wasm version.
            encoder.module_preamble(new Preamble(WasmVersion.Mvp));

            // Write each module section, ordered by its section id.
            encoder.type_section(types, /* elideIfEmpty: */ true);
            encoder.function_section(functions, /* elideIfEmpty: */ true);
            encoder.export_section(exports, /* elideIfEmpty: */ true);
            encoder.code_section(code, /* elideIfEmpty: */ true);
        }
    }

    /** Emit a binary wasm module for the given 'sourceFiles' to the specified 'outFile'. */
    export function emit(resolver: TypeChecker, host: EmitHost, diagnostics: DiagnosticCollection, sourceFiles: SourceFile[], outFile: string) {
        const wasmModule = new WasmModule(resolver, diagnostics);

        sourceFiles.forEach(sourceFile => {
            visitSourceFile(/*wasmModule,*/ sourceFile);
        });

        // Wasm is implicitly 'noEmitOnError'.  Do not write the binary if any errors were encountered.
        if (diagnostics.getDiagnostics().length === 0) {
            const wasmEncoder = new Encoder();
            wasmModule.emit(wasmEncoder);
            host.writeFile(outFile, wasmEncoder.buffer, /* writeByteOrderMark: */ false);
        }
    }

    function visitSourceFile(/*wasmModule: WasmModule,*/ sourceFile: SourceFile) {
        sourceFile.statements.forEach(statement => {
            switch (statement.kind) {
                default:
                    Debug.fail(`Unimplemented: Unsupported statement '${getTextOfNode(statement)}'.`);
            }
        });
    }
}