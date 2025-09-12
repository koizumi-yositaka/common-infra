import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';


interface ReactDistributeBucketProps extends cdk.StackProps {
  stage: string;
  appliName: string;
  invalidateLambda: lambda.Function;
}

const PREFIX = 'react-distribute-bucket-ky';

export class ReactDistributeBucket extends cdk.Stack {

  constructor(scope: Construct, id: string, props: ReactDistributeBucketProps) {
    super(scope, id, props);
    const siteBucket = new s3.Bucket(this,`${PREFIX}-cloudfront-bucket-${props.appliName}`,{
        websiteIndexDocument: 'index.html',
        websiteErrorDocument: 'index.html',
        bucketName: `${PREFIX}-cloudfront-bucket-${props.appliName}`,
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
    });
    // 外部から渡されたLambda関数を使用
    const invalidateLambda = props.invalidateLambda;

    // Lambda関数にCloudFrontディストリビューションIDを環境変数として設定
    invalidateLambda.addEnvironment('DISTRIBUTION_ID', distribution.distributionId);

    distribution.grantCreateInvalidation(invalidateLambda);

    siteBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(invalidateLambda)); 

    new cdk.CfnOutput(this, 'Hosting URL', {
      value: 'https://' + distribution.distributionDomainName
    });
  }
}