import ts from "typescript";
import { capitalizeFirstLetter } from "./common";

export const createUseQuery = (
  node: ts.SourceFile,
  className: string,
  method: ts.MethodDeclaration,
  jsDoc: (string | ts.NodeArray<ts.JSDocComment> | undefined)[] = [],
  deprecated: boolean = false
) => {
  const methodName = method.name?.getText(node)!;
  let requestParam = [];
  if (method.parameters.length !== 0) {
    requestParam.push(
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        ts.factory.createObjectBindingPattern(
          method.parameters.map((param) =>
            ts.factory.createBindingElement(
              undefined,
              undefined,
              ts.factory.createIdentifier(param.name.getText(node)),
              undefined
            )
          )
        ),
        undefined,
        ts.factory.createTypeLiteralNode(
          method.parameters.map((param) =>
            ts.factory.createPropertySignature(
              undefined,
              ts.factory.createIdentifier(param.name.getText(node)),
              param.questionToken ?? param.initializer
                ? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
                : param.questionToken,
              param.type
            )
          )
        )
      )
    );
  }

  const customHookName = `use${className}${capitalizeFirstLetter(methodName)}`;
  const queryKey = `${customHookName}Key`;

  const queryKeyGenericType = ts.factory.createTypeReferenceNode("TQueryKey");
  const queryKeyConstraint = ts.factory.createTypeReferenceNode("Array", [
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
  ]);

  // Awaited<ReturnType<typeof myClass.myMethod>>
  const awaitedResponseDataType = ts.factory.createTypeReferenceNode(
    ts.factory.createIdentifier("Awaited"),
    [
      ts.factory.createTypeReferenceNode(
        ts.factory.createIdentifier("ReturnType"),
        [
          ts.factory.createTypeQueryNode(
            ts.factory.createQualifiedName(
              ts.factory.createIdentifier(className),
              ts.factory.createIdentifier(methodName)
            ),
            undefined
          ),
        ]
      ),
    ]
  );
  // DefaultResponseDataType
  const defaultApiResponse = ts.factory.createTypeAliasDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(
      `${capitalizeFirstLetter(className)}${capitalizeFirstLetter(
        methodName
      )}DefaultResponse`
    ),
    undefined,
    awaitedResponseDataType
  );

  const TData = ts.factory.createIdentifier("TData");
  const TError = ts.factory.createIdentifier("TError");

  const responseDataType = ts.factory.createTypeParameterDeclaration(
    undefined,
    TData.text,
    undefined,
    ts.factory.createTypeReferenceNode(defaultApiResponse.name)
  );

  // Omit<UseQueryResult<Awaited<ReturnType<typeof myClass.myMethod>>, TError>, 'data'> & { data: TData|undefined };
  const responseReturnType = ts.factory.createIntersectionTypeNode([
    ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("Omit"), [
      ts.factory.createTypeReferenceNode(
        ts.factory.createIdentifier("UseQueryResult"),
        [
          defaultApiResponse.type,
          ts.factory.createTypeReferenceNode(TError, undefined),
        ]
      ),
      ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("data")),
    ]),
    ts.factory.createTypeLiteralNode([
      ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier("data"),
        undefined,
        ts.factory.createUnionTypeNode([
          ts.factory.createTypeReferenceNode(TData, undefined),
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
        ])
      ),
    ]),
  ]);

  // Return Type
  const returnTypeExport = ts.factory.createTypeAliasDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(
      `${capitalizeFirstLetter(className)}${capitalizeFirstLetter(
        methodName
      )}QueryResult`
    ),
    [
      ts.factory.createTypeParameterDeclaration(
        undefined,
        TData,
        undefined,
        ts.factory.createTypeReferenceNode(defaultApiResponse.name)
      ),
      ts.factory.createTypeParameterDeclaration(
        undefined,
        TError,
        undefined,
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
      ),
    ],
    responseReturnType
  );

  // QueryKey
  const queryKeyExport = ts.factory.createVariableStatement(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier(queryKey),
          undefined,
          undefined,
          ts.factory.createStringLiteral(
            `${className}${capitalizeFirstLetter(methodName)}`
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );

  // Custom hook
  const hookExport = ts.factory.createVariableStatement(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier(customHookName),
          undefined,
          undefined,
          ts.factory.createArrowFunction(
            undefined,
            ts.factory.createNodeArray([
              responseDataType,
              ts.factory.createTypeParameterDeclaration(
                undefined,
                TError,
                undefined,
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
              ),
              ts.factory.createTypeParameterDeclaration(
                undefined,
                "TQueryKey",
                queryKeyConstraint,
                ts.factory.createArrayTypeNode(
                  ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
                )
              ),
            ]),
            [
              ...requestParam,
              ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                ts.factory.createIdentifier("queryKey"),
                ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                queryKeyGenericType
              ),
              ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                ts.factory.createIdentifier("options"),
                ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                ts.factory.createTypeReferenceNode(
                  ts.factory.createIdentifier("Omit"),
                  [
                    ts.factory.createTypeReferenceNode(
                      ts.factory.createIdentifier("UseQueryOptions"),
                      [
                        ts.factory.createTypeReferenceNode(TData),
                        ts.factory.createTypeReferenceNode(TError),
                        ts.factory.createTypeReferenceNode(TData),
                        queryKeyGenericType,
                      ]
                    ),
                    ts.factory.createUnionTypeNode([
                      ts.factory.createLiteralTypeNode(
                        ts.factory.createStringLiteral("queryKey")
                      ),
                      ts.factory.createLiteralTypeNode(
                        ts.factory.createStringLiteral("queryFn")
                      ),
                      ts.factory.createLiteralTypeNode(
                        ts.factory.createStringLiteral("initialData")
                      ),
                    ]),
                  ]
                )
              ),
            ],
            undefined,
            ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            ts.factory.createCallExpression(
              ts.factory.createIdentifier("useQuery"),
              [
                ts.factory.createTypeReferenceNode(TData),
                ts.factory.createTypeReferenceNode(TError),
                ts.factory.createTypeReferenceNode(TData),
                queryKeyGenericType,
              ],
              [
                ts.factory.createObjectLiteralExpression([
                  ts.factory.createPropertyAssignment(
                    ts.factory.createIdentifier("queryKey"),
                    ts.factory.createAsExpression(
                      ts.factory.createArrayLiteralExpression(
                        [
                          ts.factory.createIdentifier(queryKey),
                          ts.factory.createSpreadElement(
                            ts.factory.createParenthesizedExpression(
                              ts.factory.createBinaryExpression(
                                ts.factory.createIdentifier("queryKey"),
                                ts.factory.createToken(
                                  ts.SyntaxKind.QuestionQuestionToken
                                ),
                                method.parameters.length
                                  ? ts.factory.createArrayLiteralExpression([
                                      ts.factory.createObjectLiteralExpression(
                                        method.parameters.map((param) =>
                                          ts.factory.createShorthandPropertyAssignment(
                                            ts.factory.createIdentifier(
                                              param.name.getText(node)
                                            )
                                          )
                                        )
                                      ),
                                    ])
                                  : ts.factory.createArrayLiteralExpression([])
                              )
                            )
                          ),
                        ],
                        false
                      ),
                      queryKeyGenericType
                    )
                  ),
                  ts.factory.createPropertyAssignment(
                    ts.factory.createIdentifier("queryFn"),
                    ts.factory.createArrowFunction(
                      undefined,
                      undefined,
                      [],
                      undefined,
                      ts.factory.createToken(
                        ts.SyntaxKind.EqualsGreaterThanToken
                      ),
                      ts.factory.createAsExpression(
                        ts.factory.createCallExpression(
                          ts.factory.createPropertyAccessExpression(
                            ts.factory.createIdentifier(className),
                            ts.factory.createIdentifier(methodName)
                          ),
                          undefined,
                          method.parameters.map((param) =>
                            ts.factory.createIdentifier(
                              param.name.getText(node)
                            )
                          )
                        ),
                        ts.factory.createTypeReferenceNode(TData)
                      )
                    )
                  ),
                  ts.factory.createSpreadAssignment(
                    ts.factory.createIdentifier("options")
                  ),
                ]),
              ]
            )
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );

  const deprecatedString = deprecated ? "@deprecated" : "";

  const jsDocString = [deprecatedString]
    .concat(
      jsDoc.map((comment) => {
        if (typeof comment === "string") {
          return comment;
        }
        if (Array.isArray(comment)) {
          return comment
            .map((c) => c.getText(node))
            .join("\n");
        }
        return "";
      })
    )
    // remove empty lines
    .filter(Boolean)
    // trim
    .map((comment) => comment.trim())
    // add * to each line
    .map((comment) => `* ${comment}`)
    // join lines
    .join("\n")
    // replace new lines with \n *
    .replace(/\n/g, "\n * ");

  const hookWithJSDoc = jsDocString
    ? ts.addSyntheticLeadingComment(
        hookExport,
        ts.SyntaxKind.MultiLineCommentTrivia,
        `*\n ${jsDocString}\n `,
        true,
      )
    : hookExport;

  return [defaultApiResponse, returnTypeExport, queryKeyExport, hookWithJSDoc];
};
