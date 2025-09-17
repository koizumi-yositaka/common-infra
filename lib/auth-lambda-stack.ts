import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import path = require('path');
import * as cognito from 'aws-cdk-lib/aws-cognito';
const REPOSITORY_TOP = path.resolve(__dirname,"../");
const PREFIX = 'lambda-auth-lambda';
interface AuthLambdaStackProps extends cdk.StackProps {
  stage: string;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}
export class AuthLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AuthLambdaStackProps) {
    super(scope, id, props);
    const clientId = props.userPoolClient.userPoolClientId;
    if(!clientId){
      throw new Error('COGNITO_CLIENT_ID is not set');
    }
    if(!props.userPool.userPoolArn){
      throw new Error('COGNITO_USER_POOL_ARN is not set');
    }
    // ロールを作成する関数
    function createLambdaRole(scope: Construct, name: string, actions: string[], userPoolArn: string) {      
      const role = new iam.Role(scope, `${name}Role`, {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      });
      role.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
      );
      role.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions,
        resources: [userPoolArn],
      }));
      return role;
    }

    // const signupRole = createLambdaRole(this, 'SignupLambda', [
    //   'cognito-idp:AdminCreateUser',
    //   'cognito-idp:AdminSetUserPassword',
    // ], props.userPool.userPoolArn);

    const loginRole = createLambdaRole(this, 'LoginLambda', [
      'cognito-idp:AdminInitiateAuth',
      'cognito-idp:AdminRespondToAuthChallenge',
    ], props.userPool.userPoolArn);

    const getUserRole = createLambdaRole(this, 'GetUserLambda', [
      'cognito-idp:AdminGetUser',
    ], props.userPool.userPoolArn);

    const sendEmailRole = createLambdaRole(this, 'SendEmailLambda', [
      'cognito-idp:AdminGetUser',
    ], props.userPool.userPoolArn);
    
    // Add SES permissions separately since they need different resource ARNs
    sendEmailRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ses:SendEmail'],
      resources: ['*'], // SES SendEmail requires * resource for all verified identities
    }));

    // lambdas/test を指す
    const mwLoginLambda = new lambda.Function(this, 'MwLoginLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      functionName: `${PREFIX}-mw-login-${props.stage}`,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(path.join(REPOSITORY_TOP, 'lambdas/mwLogin/dist')),
      role: loginRole,
      environment: {
        STAGE: props.stage,
        COGNITO_CLIENT_ID: clientId,
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
      },
    });
    const mwGetUserLambda = new lambda.Function(this, 'MwGetUserLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      functionName: `${PREFIX}-mw-get-user-${props.stage}`,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(path.join(REPOSITORY_TOP, 'lambdas/mwGetUser/dist')),
      role: getUserRole,
      environment: {
        STAGE: props.stage,
        COGNITO_CLIENT_ID: clientId,
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
      },
    });
    const sendEmailLambda = new lambda.Function(this, 'SendEmailLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      functionName: `${PREFIX}-send-email-${props.stage}`,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(path.join(REPOSITORY_TOP, 'lambdas/sendEmail/dist')),
      role: sendEmailRole,
      environment: {
        STAGE: props.stage,
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
        SES_SOURCE: process.env.SES_SOURCE || '',
      },
    });
    const api = new apigateway.RestApi(this, `auth-lambda-${props.stage}`, {
      deployOptions: {
        stageName: props.stage,
      },
    });

    const mwLogin = api.root.addResource('mwLogin');
    mwLogin.addMethod('POST', new apigateway.LambdaIntegration(mwLoginLambda));
    // OPTIONSメソッドを明示的に追加（Lambda関数で処理）
    mwLogin.addMethod('OPTIONS', new apigateway.LambdaIntegration(mwLoginLambda));

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: `${PREFIX}-authorizer-${props.stage}`,
    });

    // getUserエンドポイントを直接ルートに追加
    const getUser = api.root.addResource('getUser');
    getUser.addMethod('GET', new apigateway.LambdaIntegration(mwGetUserLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    // OPTIONSメソッドを明示的に追加（Lambda関数で処理）
    getUser.addMethod('OPTIONS', new apigateway.LambdaIntegration(mwGetUserLambda));

    const sendEmail = api.root.addResource('sendEmail');
    sendEmail.addMethod('POST', new apigateway.LambdaIntegration(sendEmailLambda),{
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    // OPTIONSメソッドを明示的に追加（Lambda関数で処理）
    sendEmail.addMethod('OPTIONS', new apigateway.LambdaIntegration(sendEmailLambda));



    new cdk.CfnOutput(this, `auth-lambda-url-${props.stage}`, {
      value: api.url,
      exportName: `auth-lambda-url-${props.stage}`,
    });
  }
}
