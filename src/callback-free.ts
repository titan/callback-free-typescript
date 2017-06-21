import * as ts from "typescript";

function syntaxKindToName(kind: ts.SyntaxKind) {
  return (<any>ts).SyntaxKind[kind];
}

function printAllChildren(node: ts.Node, depth = 0) {
  console.log(new Array(depth + 1).join('----'), syntaxKindToName(node.kind), node.pos, node.end, node.getText());
  depth++;
  node.getChildren().forEach(c=> printAllChildren(c, depth));
}

function convert_to_callback(declarations: ts.VariableDeclaration[], call: ts.CallExpression, statements: ts.Statement[]): ts.Statement {
  const block: ts.Block = ts.createBlock(statements);
  const parameters: ts.ParameterDeclaration[] = declarations.map(decl => ts.createParameter([], [], null, decl.getChildAt(0).getText(), null, decl.getChildCount() > 2 ? ts.createTypeReferenceNode(decl.getChildAt(2).getText(), []) : null));
  const lambda: ts.ArrowFunction = ts.createArrowFunction([], [], parameters, null, null, block);
  const args: ts.Expression [] = [];
  let found_star: boolean = false;
  for (const arg of call.arguments) {
    if (arg.getText() === "*") {
      args.push(lambda);
      found_star = true;
    } else {
      args.push(arg);
    }
  }
  if (!found_star) {
    args.push(lambda);
  }
  return ts.createStatement(ts.createCall(call.expression, [], args));
}

function iterate_statements(statements: ts.Statement[]): ts.Statement[] {
  for (let i = 0, len = statements.length; i < len; i ++) {
    const stmt: ts.Statement = statements[i];
    if (i > 0 && i < len - 1 && stmt.kind === ts.SyntaxKind.MissingDeclaration) {
      const pstmt = statements[i - 1];
      const nstmt = statements[i + 1];
      if (pstmt.kind === ts.SyntaxKind.VariableStatement && nstmt.kind === ts.SyntaxKind.ExpressionStatement && (nstmt as ts.ExpressionStatement).expression.kind === ts.SyntaxKind.CallExpression) {
        // found more than one parameter in callback
        let stmts: ts.Statement[] = null;
        if (i > 1) {
          stmts = [...statements.slice(0, i - 1), convert_to_callback((pstmt as ts.VariableStatement).declarationList.declarations, (nstmt as ts.ExpressionStatement).expression as ts.CallExpression, iterate_statements(statements.slice(i + 2)))];
        } else {
          stmts = [convert_to_callback((pstmt as ts.VariableStatement).declarationList.declarations, (nstmt as ts.ExpressionStatement).expression as ts.CallExpression, iterate_statements(statements.slice(i + 2)))];

        }
        return stmts;
      }
      if (pstmt.kind === ts.SyntaxKind.ExpressionStatement && nstmt.kind === ts.SyntaxKind.ExpressionStatement && (nstmt as ts.ExpressionStatement).expression.kind === ts.SyntaxKind.CallExpression) {
        if (pstmt.getText() === "let ()") {
          // found empty parameter in callback
          return [convert_to_callback([], (nstmt as ts.ExpressionStatement).expression as ts.CallExpression, iterate_statements(statements.slice(i + 2)))];
        }
      }
    }
  }
  return statements;
}

const transformer = <T extends ts.Node>(context: ts.TransformationContext) =>
  (rootNode: T) => {
    function visit(node: ts.Node): ts.Node {
      node = ts.visitEachChild(node, visit, context);
      if (node.kind === ts.SyntaxKind.Block) {
        const block: ts.Block = node as ts.Block;
        const statements: ts.Statement[] = block.statements;
        const stmts: ts.Statement[] = iterate_statements(statements);
        if (statements !== stmts) {
          return ts.createBlock(stmts, true);
        }
      }
      return node;
    }
    return ts.visitNode(rootNode, visit);
  };

const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
});

export function transform (source: string): string {
  const sourceFile = ts.createSourceFile("", source, ts.ScriptTarget.Latest, /*setParentNodes */ true, ts.ScriptKind.TS);

  const result: ts.TransformationResult<ts.SourceFile> = ts.transform<ts.SourceFile>(
    sourceFile, [ transformer ]
  );

  const transformed: ts.SourceFile = result.transformed[0];
  return printer.printNode(ts.EmitHint.Unspecified, transformed, transformed);
}
