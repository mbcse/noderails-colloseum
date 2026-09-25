import { S3Client } from '@aws-sdk/client-s3';

/**
 * Use explicit keys when Doppler provides them (local/dev).
 * On production the keys are empty: omit credentials so the SDK uses the
 * instance/task IAM role. Passing "" as Access Key Id makes PutObject fail
 * with AuthorizationHeaderMalformed.
 */
export function createS3Client(): S3Client {
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim() ?? '';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim() ?? '';
  return new S3Client({
    region,
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });
}
