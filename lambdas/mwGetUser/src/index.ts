import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });
const allowedOrigins = "http://localhost:5555,http://localhost:5500".split(",");
// 共通のCORSヘッダー生成関数
const getCorsHeaders = (event: APIGatewayProxyEvent) => {
  const origin = event.headers?.origin || 
                 event.headers?.Origin || 
                 event.headers?.['origin'] || 
                 event.headers?.['Origin'];
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'false'
  };
};

export const handler:APIGatewayProxyHandler = async (event:APIGatewayProxyEvent) => {
  // OPTIONSリクエスト（プリフライト）の処理
  if (event.httpMethod === 'OPTIONS') {
    console.log("Handling OPTIONS request for getUser");
    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: ''
    };
  }
  
  try {
    // API GatewayのCognito認証では、認証されたユーザー情報はevent.requestContext.authorizerに含まれる
    const authorizer = event.requestContext?.authorizer;
    if (!authorizer) {
      console.error("No authorizer found");
      return {
        statusCode: 401,
        headers: getCorsHeaders(event),
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
        headers: getCorsHeaders(event),
        body: JSON.stringify({ message: "Username not found" })
      };
    }

    // User Pool IDを環境変数から取得（必要に応じて設定）
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) {
      console.error("COGNITO_USER_POOL_ID not set");
      return {
        statusCode: 500,
        headers: getCorsHeaders(event),
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
      headers: getCorsHeaders(event),
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
      headers: getCorsHeaders(event),
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
};