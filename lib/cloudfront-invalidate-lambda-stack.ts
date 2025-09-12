import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

interface CloudFrontInvalidateLambdaStackProps extends cdk.StackProps {

}

const PREFIX = 'react-distribute-bucket-ky';
const REPOSITORY_TOP = path.resolve(__dirname, "../");

export class CloudFrontInvalidateLambdaStack extends cdk.Stack {
  public readonly invalidateLambda: NodejsFunction;

  constructor(scope: Construct, id: string, props: CloudFrontInvalidateLambdaStackProps) {
    super(scope, id, props);

    this.invalidateLambda = new NodejsFunction(this, `${PREFIX}-invalidate-lambda`, {
      functionName: `${PREFIX}-invalidate-lambda`,
      entry: path.join(REPOSITORY_TOP, "lambdas/invalidateCloudFrontCache/src/index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
    });

    new cdk.CfnOutput(this, 'InvalidateLambdaArn', {
      value: this.invalidateLambda.functionArn,
      description: 'CloudFront Invalidate Lambda Function ARN',
    });
  }
}
