import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';


interface ReactDistributeBucketProps extends cdk.StackProps {
  stage: string;
  appliName: string;
}

const PREFIX = 'distribute-bucket-ky';
const REPOSITORY_TOP = path.resolve(__dirname, "../");

export class ReactDistributeBucket extends cdk.Stack {

  constructor(scope: Construct, id: string, props: ReactDistributeBucketProps) {
    super(scope, id, props);
    
    const siteBucket = new s3.Bucket(this,`${PREFIX}-cloudfront-bucket-${props.appliName}`,{
        websiteIndexDocument: 'index.html',
        websiteErrorDocument: 'index.html',
        bucketName: `${PREFIX}-cloudfront-bucket-${props.appliName}-${props.stage}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        publicReadAccess: false,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    })
    
    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
        defaultBehavior: {
            origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket)
        },
        defaultRootObject: 'index.html',
        errorResponses: [
          {
            httpStatus: 403, // S3 が権限エラーで返す場合
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.seconds(0),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.seconds(0),
          },
        ],
    });

    // CloudFrontキャッシュ無効化用Lambda関数をこのスタック内で作成
    const invalidateLambda = new NodejsFunction(this, `${PREFIX}-invalidate-lambda`, {
      functionName: `${PREFIX}-invalidate-lambda-${props.stage}`,
      entry: path.join(REPOSITORY_TOP, "lambdas/invalidateCloudFrontCache/src/index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      environment: {
        DISTRIBUTION_ID: distribution.distributionId,
      },
    });

    distribution.grantCreateInvalidation(invalidateLambda);
    siteBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(invalidateLambda)); 

    new cdk.CfnOutput(this, 'Hosting URL', {
      value: 'https://' + distribution.distributionDomainName
    });

    new cdk.CfnOutput(this, 'InvalidateLambdaArn', {
      value: invalidateLambda.functionArn,
      description: 'CloudFront Invalidate Lambda Function ARN',
    });
  }
}