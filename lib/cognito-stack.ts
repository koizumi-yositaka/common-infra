import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';

interface CognitoStackProps extends cdk.StackProps {
  stage: string;
}

export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `esc-api-user-pool-${props.stage}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireSymbols: false,
        requireUppercase: true,
        requireLowercase: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      customAttributes: {
        roles: new cognito.StringAttribute({
          minLen: 1,
          maxLen: 50,
          mutable: true, // 後から変更可能にする
        }),
        permissions: new cognito.StringAttribute({
          minLen: 1,
          maxLen: 100,
          mutable: true,
        }),
      },
    });

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: `${cdk.Stack.of(this).stackName}-UserPoolId-${props.stage}`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      exportName: `${cdk.Stack.of(this).stackName}-UserPoolClientId-${props.stage}`,
    });
  }
}