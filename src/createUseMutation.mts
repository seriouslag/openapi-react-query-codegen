import ts from "typescript";
import {
  BuildCommonTypeName,
  MethodDescription,
  TContext,
  TData,
  TError,
  capitalizeFirstLetter,
  extractPropertiesFromObjectParam,
  getNameFromMethod,
} from "./common.mjs";
import { addJSDocToNode } from "./util.mjs";

/**
 *  Awaited<ReturnType<typeof myClass.myMethod>>
 */
function generateAwaitedReturnType({
  className,
  methodName,
}: {
  className: string;
  methodName: string;
}) {
  return ts.factory.createTypeReferenceNode(
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
}

export const createUseMutation = ({
  node,
  className,
  method,
  jsDoc = [],
  isDeprecated = false,
}: MethodDescription) => {
  const methodName = getNameFromMethod(method);
  const awaitedResponseDataType = generateAwaitedReturnType({
    className,
    methodName,
  });

  const mutationResult = ts.factory.createTypeAliasDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(
      `${className}${capitalizeFirstLetter(methodName)}MutationResult`
    ),
    undefined,
    awaitedResponseDataType
  );

  const responseDataType = ts.factory.createTypeParameterDeclaration(
    undefined,
    TData,
    undefined,
    ts.factory.createTypeReferenceNode(BuildCommonTypeName(mutationResult.name))
  );

  const methodParameters =
    method.getParameters().length !== 0
      ? ts.factory.createTypeLiteralNode(
          method
            .getParameters()
            .map((param) => {
              const paramNodes = extractPropertiesFromObjectParam(param);
              return paramNodes.map((refParam) =>
                ts.factory.createPropertySignature(
                  undefined,
                  ts.factory.createIdentifier(refParam.name),
                  refParam.optional
                    ? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
                    : undefined,
                  // refParam.questionToken ?? refParam.initializer
                  //   ? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
                  //   : refParam.questionToken,
                  ts.factory.createTypeReferenceNode(
                    refParam.type.getText(param)
                  )
                )
              );
            })
            .flat()
          // return ts.factory.createPropertySignature(
          //   undefined,
          //   ts.factory.createIdentifier(param.getName()),
          //   param.compilerNode.questionToken ?? param.compilerNode.initializer
          //     ? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
          //     : param.compilerNode.questionToken,
          //   param.compilerNode.type
          // );
        )
      : ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);

  const exportHook = ts.factory.createVariableStatement(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier(
            `use${className}${capitalizeFirstLetter(methodName)}`
          ),
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
                TContext,
                undefined,
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
              ),
            ]),
            [
              ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                ts.factory.createIdentifier("options"),
                ts.factory.createToken(ts.SyntaxKind.QuestionToken),
                ts.factory.createTypeReferenceNode(
                  ts.factory.createIdentifier("Omit"),
                  [
                    ts.factory.createTypeReferenceNode(
                      ts.factory.createIdentifier("UseMutationOptions"),
                      [
                        ts.factory.createTypeReferenceNode(TData),
                        ts.factory.createTypeReferenceNode(TError),
                        methodParameters,
                        ts.factory.createTypeReferenceNode(TContext),
                      ]
                    ),
                    ts.factory.createLiteralTypeNode(
                      ts.factory.createStringLiteral("mutationFn")
                    ),
                  ]
                ),
                undefined
              ),
            ],
            undefined,
            ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            ts.factory.createCallExpression(
              ts.factory.createIdentifier("useMutation"),
              [
                ts.factory.createTypeReferenceNode(TData),
                ts.factory.createTypeReferenceNode(TError),
                methodParameters,
                ts.factory.createTypeReferenceNode(TContext),
              ],
              [
                ts.factory.createObjectLiteralExpression([
                  ts.factory.createPropertyAssignment(
                    ts.factory.createIdentifier("mutationFn"),
                    ts.factory.createArrowFunction(
                      undefined,
                      undefined,
                      method.getParameters().length !== 0
                        ? [
                            ts.factory.createParameterDeclaration(
                              undefined,
                              undefined,
                              ts.factory.createObjectBindingPattern(
                                method
                                  .getParameters()
                                  .map((param) => {
                                    const paramNodes =
                                      extractPropertiesFromObjectParam(param);
                                    return paramNodes.map((refParam) =>
                                      ts.factory.createBindingElement(
                                        undefined,
                                        undefined,
                                        ts.factory.createIdentifier(
                                          refParam.name
                                        ),
                                        undefined
                                      )
                                    );
                                  })
                                  .flat()
                              ),
                              undefined,
                              undefined,
                              undefined
                            ),
                          ]
                        : [],
                      undefined,
                      ts.factory.createToken(
                        ts.SyntaxKind.EqualsGreaterThanToken
                      ),
                      ts.factory.createAsExpression(
                        ts.factory.createAsExpression(
                          ts.factory.createCallExpression(
                            ts.factory.createPropertyAccessExpression(
                              ts.factory.createIdentifier(className),
                              ts.factory.createIdentifier(methodName)
                            ),
                            undefined,
                            method.getParameters().length !== 0
                              ? [
                                  ts.factory.createObjectLiteralExpression(
                                    method
                                      .getParameters()
                                      .map((params) => {
                                        const paramNodes =
                                          extractPropertiesFromObjectParam(
                                            params
                                          );
                                        return paramNodes.map((refParam) =>
                                          ts.factory.createShorthandPropertyAssignment(
                                            refParam.name
                                          )
                                        );
                                      })
                                      .flat()
                                  ),
                                ]
                              : []
                          ),
                          ts.factory.createKeywordTypeNode(
                            ts.SyntaxKind.UnknownKeyword
                          )
                        ),

                        ts.factory.createTypeReferenceNode(
                          ts.factory.createIdentifier("Promise"),
                          [ts.factory.createTypeReferenceNode(TData)]
                        )
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

  const hookWithJsDoc = addJSDocToNode(exportHook, node, isDeprecated, jsDoc);

  return {
    mutationResult,
    mutationHook: hookWithJsDoc,
  };
};
