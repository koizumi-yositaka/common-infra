import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from 'path';

import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as targets from 'aws-cdk-lib/aws-route53-targets';


interface ReactDistributeBucketProps extends cdk.StackProps {
  stage: string;
  appliName: string;
  subDomain: string;
}

const PREFIX = 'distribute-bucket-ky';
const REPOSITORY_TOP = path.resolve(__dirname, "../");

export class ReactDistributeBucket extends cdk.Stack {

  constructor(scope: Construct, id: string, props: ReactDistributeBucketProps) {
    super(scope, id, props);
    const domain = process.env.DOMAIN;
    if(!domain){
      throw new Error('DOMAIN is not set');
    }
    const subDomain = props.subDomain;
    const domainName = `${subDomain}${props.appliName}.${props.stage}.${domain}`;

    console.log(domainName);

    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: domain,
    });
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });
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
        certificate: certificate,
        errorResponses: [
          {
            httpStatus: 403,
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

    new route53.ARecord(this, 'ARecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      recordName: domainName,
    });
    

    new cdk.CfnOutput(this, 'DistributionID', {
      value: distribution.distributionId
    });
    new cdk.CfnOutput(this, 'Hosting URL', {
      value: 'https://' + distribution.distributionDomainName
    });
  }
}