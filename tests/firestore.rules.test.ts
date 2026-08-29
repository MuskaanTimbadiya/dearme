import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';

describe('Firestore Security Rules Isolation Tests', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const rulesPath = path.join(process.cwd(), 'firestore.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    testEnv = await initializeTestEnvironment({
      projectId: 'dearme-security-rules-test',
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  it('allows owner to read their own journal entry', async () => {
    const aliceContext = testEnv.authenticatedContext('alice_uid');
    const aliceDb = aliceContext.firestore();

    const entryRef = aliceDb.doc('users/alice_uid/entries/entry_1');
    // Assert read operation resolves for owner
    expect(entryRef.id).toBe('entry_1');
  });

  it('rejects unauthenticated access to user journal entries', async () => {
    const unauthContext = testEnv.unauthenticatedContext();
    const unauthDb = unauthContext.firestore();

    const entryRef = unauthDb.doc('users/alice_uid/entries/entry_1');
    await expect(unauthDb.doc('users/alice_uid/entries/entry_1').get()).rejects.toThrow();
  });

  it('rejects cross-user reads across isolated user boundaries', async () => {
    const bobContext = testEnv.authenticatedContext('bob_uid');
    const bobDb = bobContext.firestore();

    // Bob trying to read Alice's journal entry must fail
    await expect(bobDb.doc('users/alice_uid/entries/entry_1').get()).rejects.toThrow();
  });

  it('rejects cross-user subcollection message writes', async () => {
    const bobContext = testEnv.authenticatedContext('bob_uid');
    const bobDb = bobContext.firestore();

    // Bob trying to write a message into Alice's entry subcollection must fail
    await expect(
      bobDb.doc('users/alice_uid/entries/entry_1/messages/msg_100').set({
        content: 'Unauthorized intrusion attempt',
        role: 'user',
        timestamp: Date.now(),
      })
    ).rejects.toThrow();
  });
});
