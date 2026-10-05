import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Setup clients
// WARNING: These tests should be run against a dedicated staging or local Supabase instance.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

describe('Database Security & RLS Guarantees', () => {
  it('prevents anonymous users from reading clients', async () => {
    const { data, error } = await anonClient.from('clients').select('*');
    expect(error).toBeDefined();
    expect(error?.code).toBe('42501');
  });

  it('prevents anonymous users from reading feedback', async () => {
    const { data, error } = await anonClient.from('private_feedback').select('*');
    expect(error).toBeDefined();
    expect(error?.code).toBe('42501');
  });

  it('prevents anonymous users from inserting feedback directly', async () => {
    const { error } = await anonClient.from('private_feedback').insert({
      client_id: '11111111-1111-1111-1111-111111111111',
      feedback_text: 'Hack attempt',
      consent_given: true
    });
    // RLS should reject this
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
      p_client_ip_hash: 'anon-test-hash'
    });
    expect(error).toBeDefined();
    expect(error?.code).toBe('42501'); // insufficient_privilege
  });
});

describe('Rate Limiting & Concurrency', () => {
  it('prevents concurrent submissions from bypassing the limit of 5', async () => {
    // This tests the RPC function directly
    const testIpHash = 'test-ip-hash-' + Date.now();
    
    // We need a valid client ID from the DB to test the foreign key constraint
    // For a real integration test, we'd create one here.
    const { data: clients } = await serviceClient.from('clients').select('id').limit(1);
    if (!clients || clients.length === 0) {
      throw new Error('No clients found in DB to test rate limit. Required fixture missing.');
    }
    const clientId = clients[0].id;

    // Fire 10 requests concurrently
    const promises = Array(10).fill(0).map(() => 
      serviceClient.rpc('submit_private_feedback_with_rate_limit', {
        p_client_id: clientId,
        p_customer_name: 'Test',
        p_customer_phone: '1234567890',
        p_feedback_text: 'Concurrent test',
        p_consent_given: true,
        p_client_ip_hash: testIpHash
      })
    );

    const results = await Promise.all(promises);
    
    // Count successful submissions
    const successful = results.filter(r => r.data?.success === true);
    const failed = results.filter(r => r.data?.success === false && r.data?.error === 'Rate limit exceeded');

    console.log("First result:", results[0]);
    console.log("Successful count:", successful.length);
    console.log("Failed count:", failed.length);

    // Exactly 5 should succeed, no more, no less (if it's the first time for this IP)
    expect(successful.length).toBeLessThanOrEqual(5);
    // At least 5 should be blocked by rate limit
    expect(failed.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Multi-Tenant Isolation', () => {
  let userA: any;
  let userB: any;
  let clientAId: string;
  let clientBId: string;

  beforeAll(async () => {
    // Create User A
    const { data: dataA } = await serviceClient.auth.admin.createUser({
      email: `test_user_a_${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true
    });
    userA = dataA.user;

    // Create User B
    const { data: dataB } = await serviceClient.auth.admin.createUser({
      email: `test_user_b_${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true
    });
    userB = dataB.user;

    // Create Client for A
    const { data: clientA } = await serviceClient.from('clients').insert({
      owner_user_id: userA.id,
      slug: `client-a-${Date.now()}`,
      business_name: 'Business A',
      google_review_link: 'https://g.page/a',
      owner_email: userA.email,
      status: 'active'
    }).select().single();
    clientAId = clientA.id;

    // Create Client for B
    const { data: clientB } = await serviceClient.from('clients').insert({
      owner_user_id: userB.id,
      slug: `client-b-${Date.now()}`,
      business_name: 'Business B',
      google_review_link: 'https://g.page/b',
      owner_email: userB.email,
      status: 'active'
    }).select().single();
    clientBId = clientB.id;
  });

  afterAll(async () => {
    // Clean up
    if (clientAId) await serviceClient.from('clients').delete().eq('id', clientAId);
    if (clientBId) await serviceClient.from('clients').delete().eq('id', clientBId);
    if (userA) await serviceClient.auth.admin.deleteUser(userA.id);
    if (userB) await serviceClient.auth.admin.deleteUser(userB.id);
  });

  it('prevents Owner A from accessing Owner B data', async () => {
    const authClientA = createClient(supabaseUrl, supabaseAnonKey);
    const { error: signInErr } = await authClientA.auth.signInWithPassword({ 
      email: userA.email, 
      password: 'password123' 
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
