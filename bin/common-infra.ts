#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CognitoStack } from '../lib/cognito-stack';
import { GitHubActionsRoleStack } from '../lib/githubActions-role-stack';
import 'dotenv/config'
import { AuthLambdaStack } from '../lib/auth-lambda-stack';
import { ReactDistributeBucket } from '../lib/react-distribute-bucket';

const stage = process.env.STAGE || 'dev';
const app = new cdk.App();

if(!process.env.AWS_ACCOUNT || !process.env.AWS_REGION){
  throw new Error("環境変数が足りません")
}

const cognitoStack = new CognitoStack(app, `${stage}CognitoStack`, {
  stage,
  env:{
    account:process.env.AWS_ACCOUNT,
    region:process.env.AWS_REGION
  }
});

new GitHubActionsRoleStack(app, `GitHubActionsRoleStack`); 

new AuthLambdaStack(app, `${stage}AuthLambdaStack`, {
  stage,
  userPool: cognitoStack.userPool,
  userPoolClient: cognitoStack.userPoolClient,
  env:{
    account:process.env.AWS_ACCOUNT,
    region:process.env.AWS_REGION
  }
});

new ReactDistributeBucket(app, `${stage}ReactDistributeBucket`, {
  stage,
  appliName: 'quiz-distributor', // アプリケーション名を指定
  subDomain: 'quiz-distributor',
  env:{
    account:process.env.AWS_ACCOUNT,
    region:process.env.AWS_REGION
  }
});

new ReactDistributeBucket(app, `${stage}ManageWorkReactDistributeBucket`, {
  stage,
  appliName: 'manage-work-react', // アプリケーション名を指定
  subDomain: 'manage-work',
  env:{
    account:process.env.AWS_ACCOUNT,
    region:process.env.AWS_REGION
  }
});