/// <reference path="encoder.ts" />
/// <reference path="../../types.ts" />

/* @internal */
namespace ts.wasm {
    function toValueType(type: Type) {
        if (type.flags & TypeFlags.Intrinsic) {
            const intrinsicType = <IntrinsicType>type;
            switch (intrinsicType.intrinsicName) {
                case "number":
                    return value_type.f64;
                case "boolean":
                    return value_type.i32;
                default:
                    Debug.fail("Unhandled intrinsic type.");
            }
        }

        Debug.fail("Unhandled type.");
    }

    /** Root wasm emit node representing the wasm module. */
    export class WasmModule {
        /** Global variables */
        readonly globals = new WasmScope(/* parent: */ undefined, /* entries: */ []);

        /** Function declarations */
        private functionDecls: WasmFunction[] = [];

        constructor(readonly resolver: TypeChecker, readonly diagnostics: DiagnosticCollection) { }

        public error(node: Node, message: DiagnosticMessage, ...args: (string | number)[]) {
            const sourceFile = getSourceFileOfNode(node);
            const span = getSpanOfTokenAtPosition(sourceFile, node.pos);
            this.diagnostics.add(createFileDiagnostic(sourceFile, span.start, span.length, message, ...args));
        }

        public function(
            name: string,
            parameters: { symbol: Symbol, type: value_type }[],
            returns: value_type[],
            isExported: boolean
        ) {
            const wasmFunc = new WasmFunction(this, name, parameters, returns, isExported);
            this.functionDecls.push(wasmFunc);
            return wasmFunc;
        }

        /** Emit the binary for the wasm module to the given encoder. */
        public emit(encoder: Encoder) {
            // Create the wasm module sections.
            const types = new TypeSection();
            const functions = new FunctionSection();
            const exports = new ExportSection();
            const code = new CodeSection();

            // Emit each function declaration into the relevant module sections.
            this.functionDecls.forEach(decl => {
                decl.emit(types, functions, exports, code);
            });

            // Write the module preamble that contains the magic number and wasm version.
            encoder.module_preamble(new Preamble(WasmVersion.Mvp));

            // Write each module section, ordered by its section id.
            encoder.type_section(types, /* elideIfEmpty: */ true);
            encoder.function_section(functions, /* elideIfEmpty: */ true);
            encoder.export_section(exports, /* elideIfEmpty: */ true);
            encoder.code_section(code, /* elideIfEmpty: */ true);
        }
    }

    export class WasmScope {
        private symbolToIndex = {};
        private indexToType = {};
        private firstIndex: number;
        private nextIndex: number;

        constructor (private parent: WasmScope, entries: { symbol: Symbol, type: value_type }[]) {
            this.firstIndex = parent !== undefined
                ? parent.nextIndex
                : 0;

            this.nextIndex = this.firstIndex;

            entries.forEach(entry => {
                this.add(entry.symbol, entry.type);
            });
        }

        public add(symbol: Symbol, type: value_type) {
            (<any>this.symbolToIndex)[symbol.id] = this.nextIndex;
            (<any>this.indexToType)[this.nextIndex] = type;
            this.nextIndex++;
        }

        private shouldDelegateToParent<T>(maybeValue: T) {
            return maybeValue === undefined && this.parent !== undefined;
        }

        /** Returns the index for the given 'symbol'. */
        public getIndexOf(symbol: Symbol): number {
            const maybeIndex = (<any>this.symbolToIndex)[symbol.id];
            if (this.shouldDelegateToParent(maybeIndex)) {
                return this.parent.getIndexOf(symbol);
            }
            return maybeIndex;
        }

        /** Returns the wasm 'value_type' for the symbol with the given index. */
        private getTypeOf(index: number): value_type {
            const type = (<any>this.indexToType)[index];
            return to_value_type(type);
        }

        public asLocals() {
            const locals: LocalEntry[] = [];
            for (let i = this.firstIndex; i < this.nextIndex; i++) {
                locals.push(new LocalEntry(1, this.getTypeOf(i)));
            }
            return locals;
        }
    }

    /** Builder for wasm function definitions. */
    export class WasmFunction {
        private func_type: FuncType;
        readonly body: WasmBlock;

        constructor (
            private module: WasmModule,
            private name: string,
            params: { symbol: Symbol, type: value_type }[],
            readonly returns: value_type[],
            readonly isExported: boolean
        ) {
            this.func_type = new FuncType(
                params.map(param => param.type),
                returns);

            // Function parameters are implicit locals, starting at index 0.  We create a pre-populated
            // scope to hold them.
            const paramsTable = new WasmScope(/* parent: */ undefined, /* entries: */ params);

            // We then create a separate scope to hold any additional locals.
            const localsTable = new WasmScope(/* parent: */ paramsTable, /* entries: */ []);

            this.body = new WasmBlock(this.module, localsTable);
        }

        public emit(types: TypeSection, functions: FunctionSection, exports: ExportSection, code: CodeSection) {
            const signatureIndex = types.add(this.func_type);
            const functionIndex = functions.add(signatureIndex);
            if (this.isExported) {
                exports.add(new ExportEntry(this.name, external_kind.Function, functionIndex));
            }
            this.body.emit(code);
        }
    }

    /** Builder for a wasm code block. */
    export class WasmBlock {
        private code: Encoder = new Encoder();

        constructor(private module: WasmModule, private locals: WasmScope) {}

        private get resolver() { return this.module.resolver; }

        private op(opcode: opcode) {
            Debug.assert(this.code !== undefined,
                "A 'WasmBlock' must not be modified after emission.");
            this.code.op(opcode);
        }

        public emit(section: CodeSection) {
            Debug.assert(this.code !== undefined,
                "A 'WasmBlock' must only be emitted once.");

            // Wasm blocks (including function bodies) are terminated by the 'end' opcode.
            this.op(opcode.end);

            section.add(
                new FunctionBody(
                    this.locals.asLocals(),
                    this.code.buffer));

            this.code = undefined;
        }
    }

    /** Emit a binary wasm module for the given 'sourceFiles' to the specified 'outFile'. */
    export function emit(resolver: TypeChecker, host: EmitHost, diagnostics: DiagnosticCollection, sourceFiles: SourceFile[], outFile: string) {
        const wasmModule = new WasmModule(resolver, diagnostics);

        sourceFiles.forEach(sourceFile => {
            visitSourceFile(wasmModule, sourceFile);
        });

        // Wasm is implicitly 'noEmitOnError'.  Do not write the binary if any errors were encountered.
        if (diagnostics.getDiagnostics().length === 0) {
            const wasmEncoder = new Encoder();
            wasmModule.emit(wasmEncoder);
            host.writeFile(outFile, wasmEncoder.buffer, /* writeByteOrderMark: */ false);
        }
    }

    function visitSourceFile(wasmModule: WasmModule, sourceFile: SourceFile) {
        sourceFile.statements.forEach(tsStatement => {
            switch (tsStatement.kind) {
                case SyntaxKind.FunctionDeclaration: {
                    visitFunctionDeclaration(wasmModule, <FunctionDeclaration>tsStatement);
                    break;
                }
                default:
                    Debug.fail(`Unimplemented: Unsupported statement '${getTextOfNode(tsStatement)}'.`);
            }
        });
    }

    function visitFunctionDeclaration(wasmModule: WasmModule, tsFunc: FunctionDeclaration) {
        const isExported = hasModifier(tsFunc, ModifierFlags.Export);

        const returnType = wasmModule.resolver.getReturnTypeOfSignature(
            wasmModule.resolver.getSignatureFromDeclaration(tsFunc));

        const params = tsFunc.parameters.map(
            paramDecl => {
                return {
                    symbol: paramDecl.symbol,
                    type: toValueType(wasmModule.resolver.getTypeOfSymbolAtLocation(paramDecl.symbol, paramDecl))
                };
            });

        const wasmFunc = wasmModule.function(
            tsFunc.name.text,
            params,
            returnType.flags & TypeFlags.Void
                ? []
                : [ toValueType(returnType) ],
            isExported);

        visitBlock(/* wasmFunc.body, */ tsFunc.body);

        return wasmFunc;
    }

    function visitBlock(/* wasmBody: WasmBlock, */ tsBlock: Block) {
        for (const tsStatement of tsBlock.statements) {
            switch (tsStatement.kind) {
                default:
                    Debug.fail(`Unimplemented: Unsupported statement in block '${getTextOfNode(tsStatement)}'.`);
            }
        }
    }
}