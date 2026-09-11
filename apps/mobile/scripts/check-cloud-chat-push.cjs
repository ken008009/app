/* eslint-disable onekey/no-raw-error -- Standalone Node CLI cannot load the app's TypeScript error runtime. */
// Read-only configuration check. Never print API keys, tokens or credential files.
const fs = require('fs');
const path = require('path');

const mobile = path.resolve(__dirname, '..');
const configPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(mobile, 'android/app/google-services.json');
const expectedProject = process.argv[3];

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (config.type === 'service_account' || config.private_key) {
    throw new Error(
      'Expected Android google-services.json, not a server credential.',
    );
  }
  const gradle = fs.readFileSync(
    path.join(mobile, 'android/app/build.gradle'),
    'utf8',
  );
  const packageName = gradle.match(/applicationId\s+['"]([^'"]+)['"]/)?.[1];
  const projectId = config.project_info?.project_id;
  const matches =
    Array.isArray(config.client) &&
    config.client.some(
      (client) =>
        client.client_info?.android_client_info?.package_name === packageName,
    );
  if (!packageName || typeof projectId !== 'string' || !matches) {
    throw new Error(
      'Firebase Android configuration does not match the app package.',
    );
  }
  console.log(`Android package: ${packageName}`);
  console.log(`Firebase project: ${projectId}`);
  if (!expectedProject) {
    console.log(
      'NOT READY: cloud-chat Firebase project has not been confirmed.',
    );
    process.exitCode = 2;
  } else if (expectedProject !== projectId) {
    throw new Error(
      'Firebase project does not match the expected cloud-chat project.',
    );
  } else {
    console.log(
      'Configuration matches. Token registration and real-device delivery remain unverified.',
    );
  }
} catch {
  console.error(
    'Cloud-chat push configuration check failed. Check file type, app package and project ID.',
  );
  process.exitCode = 1;
}
