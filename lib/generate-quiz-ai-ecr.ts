import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';


interface GenerateQuizAiEcrStackProps extends cdk.StackProps {
  stage: string;
}
export class GenerateQuizAiEcrStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GenerateQuizAiEcrStackProps) {
    super(scope, id, props);

    const ecrRepository = new ecr.Repository(this, 'GenerateQuizAiEcrRepository', {
      repositoryName: 'generate-quiz-ai-ecr',
    });

    new cdk.CfnOutput(this, 'EcrRepositoryUrl', {
      value: ecrRepository.repositoryUri,
    });

  }
}