/// <reference path="../../factory.ts" />
/// <reference path="../../visitor.ts" />

/*@internal*/
namespace ts {
    /** Rewrites AST patterns that are awkward to directly emit efficient wasm byte code for.
     *
     * Currently performs the following transformations:
     *
     *  - Reduce PrefixUnaryExpression of numeric literals into a numeric literal.
     *    Ex: PrefixUnary(-, NumericLiteral(1)) -> NumericLiteral(-1)
     */
    export function transformWasm(context: TransformationContext) {
        return transformSourceFile;

        function transformSourceFile(node: SourceFile) {
            // Skip declaration files, since there is no wasm emission for them.
            if (isDeclarationFile(node)) {
                return node;
            }

            // Recursively visit the immutable AST, building the new AST as we go.
            const visited = visitEachChild(node, visitor, context);

            // Add any helper functions, etc. that we want to automatically emit.
            addEmitHelpers(visited, context.readEmitHelpers());

            // Return the new AST.
            return visited;
        }

        function visitor(node: Node): VisitResult<Node> {
            switch (node.kind) {
                case SyntaxKind.PrefixUnaryExpression:
                    return visitPrefixUnaryExpression(node as PrefixUnaryExpression);
                default:
                    return visitEachChild(node, visitor, context);
            }
        }

        function visitPrefixUnaryExpression(node: PrefixUnaryExpression) {
            const operand = visitNode(node.operand, visitor, isExpression);

            switch (operand.kind) {
                case SyntaxKind.NumericLiteral: {
                    const value = parseFloat((operand as NumericLiteral).text);

                    switch (node.operator) {
                        // TypeScript parses negative numeric literals as (PrefixUnary - (NumericLiteral 1)).
                        // Naively, this results in byte code that multiplies a constant by a constant:
                        //
                        //      f64.const 0xbff0000000000000    // a constant value interpreted as f64
                        //      f64.const 0x3ff0000000000000    // a constant value interpreted as f64
                        //      f64.mul                         // multiplication
                        //
                        // Rather than complicate byte code emission, we rewrite the AST to reduce this pattern
                        // to a literal of a negative number (NumericLiteral -1).
                        case SyntaxKind.MinusToken:
                            return updateNode<Expression>(
                                createNumericLiteral((-value).toString()),
                                node);
                    }
                }

                default:
                    return visitEachChild(node, visitor, context);
            }
        }
    }
}