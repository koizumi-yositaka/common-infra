import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
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
    console.log("Handling OPTIONS request for sendEmail");
    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: ''
    };
  }
  
  try {
    if(!process.env.SES_SOURCE){
      console.error("SES_SOURCE is not set");
      return {
        statusCode: 500,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ message: "SES_SOURCE is not set" })
      };
    }
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { toAddresses, subject, bodyHtml } = body;
    const sesClient = new SESClient({
      region: 'us-east-1'
    });
    const command = new SendEmailCommand({
        Source: process.env.SES_SOURCE,
        Destination: {
            ToAddresses: toAddresses
        },
        Message: {
            Subject: {
                Data: subject
            },
            Body: {
                Html: {
                    Data: bodyHtml
                }
            }
        }
    });
    await sesClient.send(command);
    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({ message: "Email sent successfully" })
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