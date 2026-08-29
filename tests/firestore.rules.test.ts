import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';

describe('Firestore Security Rules Isolation Tests', () => {
  let testEnv: RulesTestEnvironment | null = null;

  beforeAll(async () => {
    const rulesPath = path.join(process.cwd(), 'firestore.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    const host = process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] || '127.0.0.1';
    const port = Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1]) || 8080;

    try {
      testEnv = await initializeTestEnvironment({
        projectId: 'dearme-security-rules-test',
        firestore: {
          rules,
          host,
          port,
        },
      });
    } catch (err: any) {
      console.warn(
        'Firestore emulator not connected on port 8080. Security rules assertions will execute when emulator daemon is running.'
      );
    }
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async (context) => {
    if (!testEnv) {
      context.skip();
      return;
    }

    await testEnv.clearFirestore();

    // Seed test documents bypassing security rules using an admin context
    await testEnv.withSecurityRulesDisabled(async (rulesDisabledContext) => {
      const adminDb = rulesDisabledContext.firestore();

      // Seed Alice user profile
      await adminDb.doc('users/alice_uid').set({
        email: 'alice@example.com',
        role: 'user',
        createdAt: Date.now(),
      });

      // Seed Alice journal entry
      await adminDb.doc('users/alice_uid/entries/entry_1').set({
        title: 'Alice Journal Entry 1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mood: 'Peaceful',
      });

      // Seed Alice message subcollection document
      await adminDb.doc('users/alice_uid/entries/entry_1/messages/msg_1').set({
        role: 'user',
        content: 'Hello journal',
        timestamp: Date.now(),
      });

      // Seed Bob user profile
      await adminDb.doc('users/bob_uid').set({
        email: 'bob@example.com',
        role: 'user',
        createdAt: Date.now(),
      });

      // Seed Admin user profile
      await adminDb.doc('users/admin_uid').set({
        email: 'admin@example.com',
        role: 'admin',
        createdAt: Date.now(),
      });
    });
  });

  // -------------------------------------------------------------
  // POSITIVE ACCESS TESTS (assertSucceeds)
  // -------------------------------------------------------------
  it('allows owner to read their own journal entry', async () => {
    if (!testEnv) return;
    const aliceContext = testEnv.authenticatedContext('alice_uid');
    const aliceDb = aliceContext.firestore();

    await assertSucceeds(aliceDb.doc('users/alice_uid/entries/entry_1').get());
  });

  it('allows owner to write and update their own journal entry', async () => {
    if (!testEnv) return;
    const aliceContext = testEnv.authenticatedContext('alice_uid');
    const aliceDb = aliceContext.firestore();

    await assertSucceeds(
      aliceDb.doc('users/alice_uid/entries/entry_1').set(
        { title: 'Updated Alice Entry Title', updatedAt: Date.now() },
        { merge: true }
      )
    );
  });

  it('allows owner to read and write their own message subcollection doc', async () => {
    if (!testEnv) return;
    const aliceContext = testEnv.authenticatedContext('alice_uid');
    const aliceDb = aliceContext.firestore();

    // Owner read message subcollection
    await assertSucceeds(
      aliceDb.doc('users/alice_uid/entries/entry_1/messages/msg_1').get()
    );

    // Owner write message subcollection
    await assertSucceeds(
      aliceDb.doc('users/alice_uid/entries/entry_1/messages/msg_2').set({
        role: 'user',
        content: 'Reflecting on my day...',
        timestamp: Date.now(),
      })
    );
  });

  it('allows an admin user to read another user profile document', async () => {
    if (!testEnv) return;
    const adminContext = testEnv.authenticatedContext('admin_uid');
    const adminDb = adminContext.firestore();

    await assertSucceeds(adminDb.doc('users/alice_uid').get());
  });

  // -------------------------------------------------------------
  // NEGATIVE ACCESS & ROLE ESCALATION TESTS (assertFails)
  // -------------------------------------------------------------
  it('rejects a user trying to escalate their own role to admin', async () => {
    if (!testEnv) return;
    const aliceContext = testEnv.authenticatedContext('alice_uid');
    const aliceDb = aliceContext.firestore();

    // User trying to change role field to admin must be blocked by rules
    await assertFails(
      aliceDb.doc('users/alice_uid').set({ role: 'admin' }, { merge: true })
    );
  });

  it('rejects unauthenticated access to user journal entries', async () => {
    if (!testEnv) return;
    const unauthContext = testEnv.unauthenticatedContext();
    const unauthDb = unauthContext.firestore();

    await assertFails(unauthDb.doc('users/alice_uid/entries/entry_1').get());
  });

  it('rejects cross-user reads across isolated user boundaries', async () => {
    if (!testEnv) return;
    const bobContext = testEnv.authenticatedContext('bob_uid');
    const bobDb = bobContext.firestore();

    // Bob trying to read Alice's journal entry must fail
    await assertFails(bobDb.doc('users/alice_uid/entries/entry_1').get());
  });

  it('rejects cross-user message subcollection reads', async () => {
    if (!testEnv) return;
    const bobContext = testEnv.authenticatedContext('bob_uid');
    const bobDb = bobContext.firestore();

    // Bob trying to read Alice's message subcollection doc must fail
    await assertFails(
      bobDb.doc('users/alice_uid/entries/entry_1/messages/msg_1').get()
    );
  });

  it('rejects cross-user message subcollection writes', async () => {
    if (!testEnv) return;
    const bobContext = testEnv.authenticatedContext('bob_uid');
    const bobDb = bobContext.firestore();

    // Bob trying to write a message into Alice's entry subcollection must fail
    await assertFails(
      bobDb.doc('users/alice_uid/entries/entry_1/messages/msg_100').set({
        content: 'Unauthorized intrusion attempt',
        role: 'user',
        timestamp: Date.now(),
      })
    );
  });
});
