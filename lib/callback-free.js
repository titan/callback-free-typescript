"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function syntaxKindToName(kind) {
    return ts.SyntaxKind[kind];
}
function printAllChildren(node, depth) {
    if (depth === void 0) { depth = 0; }
    console.log(new Array(depth + 1).join('----'), syntaxKindToName(node.kind), node.pos, node.end, node.getText());
    depth++;
    node.getChildren().forEach(function (c) { return printAllChildren(c, depth); });
}
function convert_to_callback(declarations, call, statements) {
    var block = ts.createBlock(statements);
    var parameters = declarations.map(function (decl) { return ts.createParameter([], [], null, decl.getChildAt(0).getText(), null, decl.getChildCount() > 2 ? ts.createTypeReferenceNode(decl.getChildAt(2).getText(), []) : null); });
    var lambda = ts.createArrowFunction([], [], parameters, null, null, block);
    var args = [];
    var found_star = false;
    for (var _i = 0, _a = call.arguments; _i < _a.length; _i++) {
        var arg = _a[_i];
        if (arg.getText() === "*") {
            args.push(lambda);
            found_star = true;
        }
        else {
            args.push(arg);
        }
    }
    if (!found_star) {
        args.push(lambda);
    }
    return ts.createStatement(ts.createCall(call.expression, [], args));
}
function iterate_statements(statements) {
    for (var i = 0, len = statements.length; i < len; i++) {
        var stmt = statements[i];
        if (i > 0 && i < len - 1 && stmt.kind === ts.SyntaxKind.MissingDeclaration) {
            var pstmt = statements[i - 1];
            var nstmt = statements[i + 1];
            if (pstmt.kind === ts.SyntaxKind.VariableStatement && nstmt.kind === ts.SyntaxKind.ExpressionStatement && nstmt.expression.kind === ts.SyntaxKind.CallExpression) {
                // found more than one parameter in callback
                var stmts = null;
                if (i > 1) {
                    stmts = statements.slice(0, i - 1).concat([convert_to_callback(pstmt.declarationList.declarations, nstmt.expression, iterate_statements(statements.slice(i + 2)))]);
                }
                else {
                    stmts = [convert_to_callback(pstmt.declarationList.declarations, nstmt.expression, iterate_statements(statements.slice(i + 2)))];
                }
                return stmts;
            }
            if (pstmt.kind === ts.SyntaxKind.ExpressionStatement && nstmt.kind === ts.SyntaxKind.ExpressionStatement && nstmt.expression.kind === ts.SyntaxKind.CallExpression) {
                if (pstmt.getText() === "let ()") {
                    // found empty parameter in callback
                    return [convert_to_callback([], nstmt.expression, iterate_statements(statements.slice(i + 2)))];
                }
            }
        }
    }
    return statements;
}
var transformer = function (context) {
    return function (rootNode) {
        function visit(node) {
            node = ts.visitEachChild(node, visit, context);
            if (node.kind === ts.SyntaxKind.Block) {
                var block = node;
                var statements = block.statements;
                var stmts = iterate_statements(statements);
                if (statements !== stmts) {
                    return ts.createBlock(stmts, true);
                }
            }
            return node;
        }
        return ts.visitNode(rootNode, visit);
    };
};
var printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
});
function transform(source) {
    var sourceFile = ts.createSourceFile("", source, ts.ScriptTarget.Latest, /*setParentNodes */ true, ts.ScriptKind.TS);
    var result = ts.transform(sourceFile, [transformer]);
    var transformed = result.transformed[0];
    return printer.printNode(ts.EmitHint.Unspecified, transformed, transformed);
}
exports.transform = transform;
