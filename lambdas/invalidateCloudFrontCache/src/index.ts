import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

const cloudfront = new CloudFrontClient({});

export const handler = async () => {
  const distributionId = process.env.DISTRIBUTION_ID;
  
  if (!distributionId) {
    console.error("DISTRIBUTION_IDが設定されていません");
    return;
  }

  try {
    const command = new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `${Date.now()}`,
        Paths: {
          Quantity: 1,
          Items: ["/*"], // 全キャッシュをクリア
        },
      },
    });

    const response = await cloudfront.send(command);
    console.log("Invalidation created:", response.Invalidation?.Id);
  } catch (error) {
    console.error("Error creating invalidation:", error);
  }
};