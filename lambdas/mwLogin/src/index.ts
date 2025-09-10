import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { APIGatewayProxyHandler } from "aws-lambda";

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

export const handler:APIGatewayProxyHandler = async (event: any) => {
  if(!process.env.COGNITO_CLIENT_ID){
    console.error("Missing required environment variables");
    return {
      statusCode: 400,
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
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
}; 