# deploy 時

1. npm run build:lambdas

1. aws sso login --profile {your-profile}

1. 確認
   cdk synth dev/ApiRoutingStack --profile {your-profile}
   cdk diff dev/ApiRoutingStack --profile {your-profile}

1. デプロイ
   npm run build:lambdas
   cdk deploy dev/AuthLambdaStack --profile escco

# GitHubActionsRoleStack の deploy

これをしないと github actions はうまくいきません。

1. デプロイ
   cdk deploy GitHubActionsRoleStack --profile {your-profile}
2. 出力結果を反映
   以下のように出力されるので github の secret に「AWS_ROLE_ARN」という名前で XXX を保存
   GitHubActionsRoleStack.RoleArn = XXX

# Cognito の deploy



cdk bootstrap \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
  --trust arn:aws:iam::260337063361:role/GitHubActionsRole \
  aws://260337063361/us-east-1