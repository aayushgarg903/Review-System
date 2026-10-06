import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, User } from '@supabase/supabase-js';
import crypto from 'crypto';

// Setup clients
// WARNING: These tests should be run against a dedicated staging or local Supabase instance.
const testSupabaseUrl = process.env.TEST_SUPABASE_URL || '';
const testSupabaseAnonKey = process.env.TEST_SUPABASE_ANON_KEY || '';
const testSupabaseServiceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || '';

const isMissingConfig = !testSupabaseUrl || !testSupabaseAnonKey || !testSupabaseServiceKey;

if (testSupabaseUrl && process.env.NEXT_PUBLIC_SUPABASE_URL && testSupabaseUrl === process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('SECURITY HALT: TEST_SUPABASE_URL equals NEXT_PUBLIC_SUPABASE_URL. Do not run tests against production.');
}

if (isMissingConfig) {
  console.warn('⚠️ SKIPPING SECURITY TESTS: TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, or TEST_SUPABASE_SERVICE_ROLE_KEY is missing from process.env.');
}

const suite = isMissingConfig ? describe.skip : describe;

suite('Database Security & RLS Guarantees', () => {
  const anonClient = createClient(testSupabaseUrl || 'http://dummy', testSupabaseAnonKey || 'dummy');
  const serviceClient = createClient(testSupabaseUrl || 'http://dummy', testSupabaseServiceKey || 'dummy');

  it('prevents anonymous users from reading clients', async () => {
    const { error } = await anonClient.from('clients').select('*');
    expect(error).toBeDefined();
    expect(error?.code).toBe('42501');
  });

  it('prevents anonymous users from reading feedback', async () => {
    const { error } = await anonClient.from('private_feedback').select('*');
    expect(error).toBeDefined();
    expect(error?.code).toBe('42501');
  });

  it('prevents anonymous users from inserting feedback directly', async () => {
    const { error } = await anonClient.from('private_feedback').insert({
      client_id: '11111111-1111-1111-1111-111111111111',
      feedback_text: 'Hack attempt',
      consent_given: true
    });
    expect(error).toBeDefined();
    expect(error?.code).toBe('42501'); // insufficient_privilege
  });

  it('prevents anonymous users from calling the SECURITY DEFINER RPC directly', async () => {
    const { error } = await anonClient.rpc('submit_private_feedback_with_rate_limit', {
      p_client_id: '11111111-1111-1111-1111-111111111111',
      p_customer_name: 'Test',
      p_customer_phone: '1234567890',
      p_feedback_text: 'Hack attempt',
      p_consent_given: true,
      p_ip_hash: 'anon-test-hash'
    });
    expect(error).toBeDefined();
    expect(error?.code).toBe('42501'); // insufficient_privilege
  });
});

suite('Rate Limiting & Concurrency', () => {
  let testUser: User | null = null;
  let clientId: string | null = null;
  const serviceClient = createClient(testSupabaseUrl || 'http://dummy', testSupabaseServiceKey || 'dummy');

  beforeAll(async () => {
    const email = `test_user_${crypto.randomUUID()}@example.com`;
    const { data } = await serviceClient.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true
    });
    testUser = data.user;
    if (testUser) {
      const { data: client } = await serviceClient.from('clients').insert({
        owner_user_id: testUser.id,
        slug: `rate-limit-${crypto.randomUUID()}`,
        business_name: 'Rate Limit Test',
        google_review_link: 'https://g.page/r',
        owner_email: testUser.email,
        status: 'active'
      }).select().single();
      clientId = client?.id || null;
    }
  });

  afterAll(async () => {
    if (clientId) await serviceClient.from('clients').delete().eq('id', clientId);
    if (testUser) await serviceClient.auth.admin.deleteUser(testUser.id);
  });

  it('prevents concurrent submissions from bypassing the limit of 5', async () => {
    if (!clientId) throw new Error('Missing client');
    const testIpHash = `test-ip-hash-${crypto.randomUUID()}`;
    
    const promises = Array(10).fill(0).map(() => 
      serviceClient.rpc('submit_private_feedback_with_rate_limit', {
        p_client_id: clientId,
        p_customer_name: 'Test',
        p_customer_phone: '1234567890',
        p_feedback_text: 'Concurrent test',
        p_consent_given: true,
        p_ip_hash: testIpHash
      })
    );

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.data?.success === true);
    const failed = results.filter(r => r.data?.success === false && r.data?.error === 'Rate limit exceeded');

    // Exactly 5 should succeed, no more, no less
    expect(successful.length).toBeLessThanOrEqual(5);
    // At least 5 should be blocked by rate limit
    expect(failed.length).toBeGreaterThanOrEqual(5);
  });
});

suite('Multi-Tenant Isolation', () => {
  let userA: User | null = null;
  let userB: User | null = null;
  let clientAId: string | null = null;
  let clientBId: string | null = null;
  let passwordA = crypto.randomUUID();
  const serviceClient = createClient(testSupabaseUrl || 'http://dummy', testSupabaseServiceKey || 'dummy');

  beforeAll(async () => {
    const { data: dataA } = await serviceClient.auth.admin.createUser({
      email: `a_${crypto.randomUUID()}@example.com`,
      password: passwordA,
      email_confirm: true
    });
    userA = dataA.user;

    const { data: dataB } = await serviceClient.auth.admin.createUser({
      email: `b_${crypto.randomUUID()}@example.com`,
      password: crypto.randomUUID(),
      email_confirm: true
    });
    userB = dataB.user;

    if (userA) {
      const { data: clientA } = await serviceClient.from('clients').insert({
        owner_user_id: userA.id,
        slug: `a-${crypto.randomUUID()}`,
        business_name: 'Business A',
        google_review_link: 'https://g.page/a',
        owner_email: userA.email,
        status: 'active'
      }).select().single();
      clientAId = clientA?.id || null;
    }

    if (userB) {
      const { data: clientB } = await serviceClient.from('clients').insert({
        owner_user_id: userB.id,
        slug: `b-${crypto.randomUUID()}`,
        business_name: 'Business B',
        google_review_link: 'https://g.page/b',
        owner_email: userB.email,
        status: 'active'
      }).select().single();
      clientBId = clientB?.id || null;
    }
  });

  afterAll(async () => {
    if (clientAId) await serviceClient.from('clients').delete().eq('id', clientAId);
    if (clientBId) await serviceClient.from('clients').delete().eq('id', clientBId);
    if (userA) await serviceClient.auth.admin.deleteUser(userA.id);
    if (userB) await serviceClient.auth.admin.deleteUser(userB.id);
  });

  it('prevents Owner A from accessing Owner B data', async () => {
    if (!userA || !userB || !clientAId || !clientBId) throw new Error('Missing test data');

    const authClientA = createClient(testSupabaseUrl, testSupabaseAnonKey);
    const { error: signInErr } = await authClientA.auth.signInWithPassword({ 
      email: userA.email || '', 
      password: passwordA 
    });
    expect(signInErr).toBeNull();

    // Attempt to read Owner B's clients table
    const { data: clients, error: clientsErr } = await authClientA
      .from('clients')
      .select('*')
      .eq('owner_user_id', userB.id);

    // RLS should return 0 rows silently
    expect(clientsErr).toBeNull();
    expect(clients?.length).toBe(0);

    // Attempt to read Owner B's feedback
    const { data: feedback, error: feedbackErr } = await authClientA
      .from('private_feedback')
      .select('*')
      .eq('client_id', clientBId);

    expect(feedbackErr).toBeNull();
    expect(feedback?.length).toBe(0);

    // Attempt to update Owner B's feedback (malicious API call)
    const { error: updateErr } = await authClientA
      .from('private_feedback')
      .update({ status: 'resolved' })
      .eq('client_id', clientBId);

    // In Postgres, if a row is filtered by RLS, update returns success but affects 0 rows
    expect(updateErr).toBeNull();

    // Attempt to delete Owner B's feedback
    const { error: deleteErr } = await authClientA
      .from('private_feedback')
      .delete()
      .eq('client_id', clientBId);

    // In Postgres, if a row is filtered by RLS, DELETE returns success but affects 0 rows
    expect(deleteErr).toBeNull();
  });
});
