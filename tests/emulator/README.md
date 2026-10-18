# Firebase emulator workflow tests

These tests use synthetic fixtures only. Emulator mode hard-codes the Firebase project ID to `demo-angel-pet-audit`, uses a placeholder API key, and connects Auth, Firestore, and Storage to localhost. Do not remove those guards or substitute the production project.

## Prerequisites

- Node.js 20.19 or later
- JDK 21 or later available as `java` on `PATH` (required by the Firestore emulator)

No Firebase Console project, production credentials, or service-account key is required.

## Run

From the repository root:

```powershell
npm ci
npm run test:emulator
```

The Firebase CLI starts the Auth, Firestore, and Storage emulators for the demo project, runs the test type-check and test suite, then shuts the emulators down. The tests create only emulator users and synthetic records. They do not deploy or alter Firebase rules or access the production project.
