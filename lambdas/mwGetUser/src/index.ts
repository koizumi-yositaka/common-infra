import {
  CognitoIdentityProviderClient,
  GetUserCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

export const handler:APIGatewayProxyHandler = async (event:APIGatewayProxyEvent) => {
  try {
    // API Gateway の Authorization ヘッダーからトークンを取得
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      console.error("Unauthorized");
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized" })
      };
    }

    // "Bearer " が付いていたら取り除く
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    const command = new GetUserCommand({
      AccessToken: accessToken
    });

    const response = await client.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify(response.UserAttributes)
    };
  } catch (error: any) {
    console.error("Error fetching user attributes:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
};