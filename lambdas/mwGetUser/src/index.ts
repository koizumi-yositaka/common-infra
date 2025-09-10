import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

export const handler:APIGatewayProxyHandler = async (event:APIGatewayProxyEvent) => {
  try {
    // API GatewayのCognito認証では、認証されたユーザー情報はevent.requestContext.authorizerに含まれる
    const authorizer = event.requestContext?.authorizer;
    if (!authorizer) {
      console.error("No authorizer found");
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized" })
      };
    }

    // Cognito認証の場合、ユーザー情報はauthorizer.claimsに含まれる
    const claims = authorizer.claims || authorizer;
    const username = claims['cognito:username'];
    
    if (!username) {
      console.error("No username found in claims");
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Username not found" })
      };
    }

    // User Pool IDを環境変数から取得（必要に応じて設定）
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) {
      console.error("COGNITO_USER_POOL_ID not set");
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Configuration error" })
      };
    }

    // AdminGetUserでカスタム属性を含む完全なユーザー情報を取得
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: username
    });

    const userData = await client.send(getUserCommand);
    
    // カスタム属性を抽出
    const customAttributes = userData.UserAttributes?.reduce((acc, attr) => {
      if (attr.Name && attr.Value) {
        acc[attr.Name] = attr.Value;
      }
      return acc;
    }, {} as Record<string, string>) || {};

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "User information retrieved successfully",
        user: {
          sub: claims.sub,
          email: claims.email,
          username: claims['cognito:username'],
          tokenUse: claims.token_use,
          roles: customAttributes['custom:roles'] || null,
          permissions: customAttributes['custom:permissions'] || null,
          userStatus: userData.UserStatus,
          enabled: userData.Enabled,
          userCreateDate: userData.UserCreateDate,
          userLastModifiedDate: userData.UserLastModifiedDate
        }
      })
    };
  } catch (error: any) {
    console.error("Error fetching user attributes:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
};