# deploy 時

1. aws sso login --profile {your-profile}

2. 確認
   cdk synth dev/ApiRoutingStack --profile {your-profile}
   cdk diff dev/ApiRoutingStack --profile {your-profile}

3. デプロイ
   cdk deploy dev/ApiRoutingStack --profile {your-profile}

# GitHubActionsRoleStack の deploy

1. デプロイ
   cdk deploy GitHubActionsRoleStack --profile {your-profile}
2. 出力結果を反映
   以下のように出力されるので github の secret に「AWS_ROLE_ARN」という名前で保存
   GitHubActionsRoleStack.RoleArn = arn:aws:iam::260337063361:role/GitHubActionsRoleStack-GitHubActionsRole4F1BBA26-O9hinZIdLx8u

# Cognito の deploy
