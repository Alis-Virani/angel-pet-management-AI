const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const email = process.argv[2];
const projectId = process.env.FIREBASE_PROJECT_ID;

if (!email || !projectId || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    'Usage: set GOOGLE_APPLICATION_CREDENTIALS to a protected service-account JSON path, ' +
    'set FIREBASE_PROJECT_ID, then run npm run authority:grant-owner -- owner@example.com'
  );
  process.exit(1);
}

async function grantOwnerAdmin() {
  const app = initializeApp({
    credential: applicationDefault(),
    projectId
  });
  const auth = getAuth(app);
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, {
    ...user.customClaims,
    admin: true
  });
  console.info(`Granted admin custom claim to ${user.email} (${user.uid}) in ${projectId}.`);
  console.info('The owner must sign out and sign in again to refresh the ID token.');
}

grantOwnerAdmin().catch((error) => {
  console.error('Unable to grant owner admin claim:', error);
  process.exitCode = 1;
});
