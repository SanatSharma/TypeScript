/// <reference path="encoder.ts" />
/// <reference path="../../types.ts" />

/* @internal */
namespace ts.wasm {
    /** Temporary helper to invoke Debug.fail() for an unexpected TypeScript node.  Once the compiler is
        sufficiently complete, this should be replaced with helpful messages logged to the DiagnosticCollection
        to notify users when the use unsupported language features.

        https://github.com/DLehenbauer/TypeScript/issues/4
     */
    function unexpectedNode(node: Node) {
        // Use of 'eval(..)' in the below template literal circumvents TypeScript's requirement that const
        // enums are only indexed by const literals.  This is poor practice, but useful for this temporary
        // helper.
        Debug.fail(`Unexpected node '${getTextOfNode(node)}' in ${arguments.callee.caller}.  (kind='${eval(`ts.SyntaxKind[${node.kind}]`)}')`);
    }

    /* <SANAT> function takes in node, finds the type and then 
        returns the appropriate opCode */
    function toValueType(type: Type) {
        if (type.flags & TypeFlags.Intrinsic) {
            const intrinsicType = <IntrinsicType>type;
            switch (intrinsicType.intrinsicName) {
                case "number":
                    return value_type.f64;
                case "boolean":
                    return value_type.i32;
                default:
                    Debug.fail(`Unexpected intrinsic type '${intrinsicType.intrinsicName}'.`);
                    break;
            }
        }

        Debug.fail(`Unexpected type '${type.symbol.name}'.`);
    }

    /** In memory representation of a wasm module, built while traversing the TypeScript AST. */
    export class WasmModule {
        /** Global variables */
        readonly globals = new WasmScope(/* parent: */ undefined, /* entries: */ []);

        /** Function definitions. */
        private functionDecls: WasmFunction[] = [];

        constructor(readonly resolver: TypeChecker, readonly diagnostics: DiagnosticCollection) { }

        public error(node: Node, message: DiagnosticMessage, ...args: (string | number)[]) {
            const sourceFile = getSourceFileOfNode(node);
            const span = getSpanOfTokenAtPosition(sourceFile, node.pos);
            this.diagnostics.add(createFileDiagnostic(sourceFile, span.start, span.length, message, ...args));
        }

        /** Add a 'WasmFunction' wasm function definition with the given 'name', 'parameters' and 'returns' type(s).
            If 'isExported' is true, the function declaration is added to the module's exports table.

            The 'WasmFunction' instance is returned to the caller, which typically writes opcodes into the body.*/
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

        /** Write the wasm module to the given encoder. */
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

    /** Maps TypeScript Symbols to the their corresponding wasm type and local/global index. */
    export class WasmScope {
        /** Map from TypeScript 'symbol' to wasm local/global index. */
        private symbolToIndex = {};

        /** Map from wasm local/global index to wasm type. */
        private indexToType = {};

        /** The wasm index of the first entry in this scope. */
        private firstIndex: number;

        /** The next available wasm index in this scope. */
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

        /** Add the given 'symbol' with corresponding wasm 'type' to this scope. */
        public add(symbol: Symbol, type: value_type) {
            (<any>this.symbolToIndex)[symbol.id] = this.nextIndex;
            (<any>this.indexToType)[this.nextIndex] = type;
            this.nextIndex++;
        }

        /** Returns true if the 'maybeValue' is undefined and a parent scope exists. */
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

        /** Returns the wasm 'value_type' for the symbol with the given index.  Note that this does
            not walk up the parent hierarchy of scopes. */
        private getTypeOf(index: number): value_type {
            const type = (<any>this.indexToType)[index];
            return to_value_type(type);
        }

        /** Maps the contents of this WasmScope to wasm LocalEntry instances.  Note that this does
            not walk up the parent hierarchy of scopes. */
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
        /** The wasm 'func_type' describing the signature of this function. */
        private func_type: FuncType;

        /** The WasmBlock containing the 'body' of this function. */
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

        /** Called by WasmModule.emit() to add each function declaration to the given module tables. */
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
        private _code: OpEncoder = new OpEncoder();

        constructor(private module: WasmModule, private locals: WasmScope) {}

        private get resolver() { return this.module.resolver; }

        /** The opcode encoder for writing opcodes into this wasm block's code entry. */
        public get code() { return this._code; }

        /** Write the appropriate opcodes to load the given TypeScript symbol and push its value
            on to the stack. */
        public loadSymbol(symbol: Symbol) {
            const localIndex = this.locals.getIndexOf(symbol);
            if (localIndex !== undefined) {
                this.code.get_local(localIndex);
                return;
            }

            Debug.fail(`Unresolved symbol '${symbol.name}'.`);
        }

        /** Write the appropriate opcodes to load the given TypeScript identifier and push its value
            on to the stack. */
        public loadIdentifier(tsIdentifier: Identifier) {
            this.loadSymbol(this.resolver.getSymbolAtLocation(tsIdentifier));
        }

        /** Writes this wasm block's byte code into the given code section. */
        public emit(section: CodeSection) {
            Debug.assert(this.code !== undefined,
                "A 'WasmBlock' must only be emitted once.");

            // Wasm blocks (including function bodies) are terminated by the 'end' opcode.
            this.code.end();

            section.add(
                new FunctionBody(
                    this.locals.asLocals(),
                    this.code.buffer));

            this._code = undefined;
        }
    }

    /** Emit a binary wasm module for the given 'sourceFiles' to the specified 'outFile'. */
    export function emit(resolver: TypeChecker, host: EmitHost, diagnostics: DiagnosticCollection, sourceFiles: SourceFile[], outFile: string) {
        const wasmModule = new WasmModule(resolver, diagnostics);

        // Visit each source file, emitting it's contribution into the wasmModule.
        sourceFiles.forEach(sourceFile => visitSourceFile(wasmModule, sourceFile));

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
                    unexpectedNode(tsStatement);
                    break;
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

        visitBlock(wasmFunc.body, tsFunc.body);

        return wasmFunc;
    }

    function visitBlock(wasmBlock: WasmBlock, tsBlock: Block) {
        for (const tsStatement of tsBlock.statements) {
            switch (tsStatement.kind) {
                case SyntaxKind.ReturnStatement:
                    const tsReturnStmt = <ReturnStatement>tsStatement;

                    const tsReturnExpr = tsReturnStmt.expression;
                    if (tsReturnExpr) {
                        visitExpression(wasmBlock, tsReturnExpr);
                    }

                    wasmBlock.code.return();
                    break;

                default:
                    unexpectedNode(tsStatement);
                    break;
            }
        }
    }

    function visitBinaryExpression(wasmBlock: WasmBlock, tsExpression: BinaryExpression) {
        visitExpression(wasmBlock, tsExpression.left);
        visitExpression(wasmBlock, tsExpression.right);

        const tsOperator = tsExpression.operatorToken;
        switch (tsOperator.kind) {
            case SyntaxKind.PlusToken:
                wasmBlock.code.f64.add();
                break;
            case SyntaxKind.MinusToken:
                wasmBlock.code.f64.sub();
                break;
            case SyntaxKind.AsteriskToken:
                wasmBlock.code.f64.mul();
                break;
            case SyntaxKind.SlashToken:
                wasmBlock.code.f64.div();
                break;
            default:
                unexpectedNode(tsOperator);
                break;
        }
    }

    function visitPrefixUnaryExpression(wasmBlock: WasmBlock, tsExpression: PrefixUnaryExpression) {
        const tsOperator = tsExpression.operator;
        switch (tsOperator) {
            case SyntaxKind.MinusToken:
                wasmBlock.code.f64.const(-1);
                visitExpression(wasmBlock, tsExpression.operand);
                wasmBlock.code.f64.mul();
                break;
            default:
                unexpectedNode(tsExpression);
                break;
        }
    }

    function visitNumericLiteral(wasmBlock: WasmBlock, tsExpression: NumericLiteral) {
        let value = parseFloat(tsExpression.text);
        wasmBlock.code.f64.const(value);
    }

    function visitExpression(wasmBlock: WasmBlock, tsExpression: Expression) {
        switch (tsExpression.kind) {
            case SyntaxKind.BinaryExpression:
                visitBinaryExpression(wasmBlock, <BinaryExpression>tsExpression);
                break;
            case SyntaxKind.PrefixUnaryExpression:
                visitPrefixUnaryExpression(wasmBlock, <PrefixUnaryExpression>tsExpression);
                break;
            case SyntaxKind.Identifier:
                wasmBlock.loadIdentifier(<Identifier>tsExpression);
                break;
            case SyntaxKind.ParenthesizedExpression:
                visitExpression(wasmBlock, (<ParenthesizedExpression>tsExpression).expression);
                break;
            case SyntaxKind.NumericLiteral:
                visitNumericLiteral(wasmBlock, (<NumericLiteral>tsExpression));
                break;
            default:
                unexpectedNode(tsExpression);
                break;
        }
    }
}