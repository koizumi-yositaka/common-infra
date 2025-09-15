import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
// 共通のCORSヘッダー生成関数
const getCorsHeaders = (event: APIGatewayProxyEvent) => {
  const origin = event.headers?.origin || 
                 event.headers?.Origin || 
                 event.headers?.['origin'] || 
                 event.headers?.['Origin'];
  const allowedOrigin =origin && allowedOrigins.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'false'
  };
};

export const handler:APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  // OPTIONSリクエスト（プリフライト）の処理
  if (event.httpMethod === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: ''
    };
  }
  
  if(!process.env.COGNITO_CLIENT_ID){
    console.error("Missing required environment variables");
    return {
      statusCode: 400,
      headers: getCorsHeaders(event),
      body: JSON.stringify({ message: "Missing required environment variables" })
    }
  }
  const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
  try {
    // API Gatewayからのリクエストボディをパース
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { username, password } = body;

    if (!username || !password) {
      console.error("Username and password are required");
      return {
        statusCode: 400,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ message: "Username and password are required" })
      }
    }

    // Cognitoのログイン（USER_PASSWORD_AUTH）
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      }
    });
    const response = await client.send(command);

    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        accessToken: response.AuthenticationResult?.AccessToken,
        idToken: response.AuthenticationResult?.IdToken,
        refreshToken: response.AuthenticationResult?.RefreshToken,
        expiresIn: response.AuthenticationResult?.ExpiresIn
      })
    };
  } catch (error: any) {
    console.error("Login error:", error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(event),
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
}; 
