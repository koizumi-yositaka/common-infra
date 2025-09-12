#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CognitoStack } from '../lib/cognito-stack';
import { GitHubActionsRoleStack } from '../lib/githubActions-role-stack';
import 'dotenv/config'
import { AuthLambdaStack } from '../lib/auth-lambda-stack';
import { ReactDistributeBucket } from '../lib/react-distribute-bucket';

const stage = process.env.STAGE || 'dev';
const app = new cdk.App();
const st = new cdk.Stage(app, stage);

if(!process.env.AWS_ACCOUNT || !process.env.AWS_REGION){
  throw new Error("環境変数が足りません")
}
const cognitoStack = new CognitoStack(st, `CognitoStack`, {
  stage,
  env:{
    account:process.env.AWS_ACCOUNT,
    region:process.env.AWS_REGION
  }
});

new GitHubActionsRoleStack(app, `GitHubActionsRoleStack`); 

new AuthLambdaStack(st, `AuthLambdaStack`, {
  stage,
  userPool: cognitoStack.userPool,
  userPoolClient: cognitoStack.userPoolClient,
  env:{
    account:process.env.AWS_ACCOUNT,
    region:process.env.AWS_REGION
  }
});

new ReactDistributeBucket(st, `ReactDistributeBucket`, {
  stage,
  appliName: 'my-app', // アプリケーション名を指定
  env:{
    account:process.env.AWS_ACCOUNT,
    region:process.env.AWS_REGION
  }
});