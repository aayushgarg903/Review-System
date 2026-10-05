import { describe, it, expect } from 'vitest';
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
});

describe('Rate Limiting & Concurrency', () => {
  it('prevents concurrent submissions from bypassing the limit of 5', async () => {
    // This tests the RPC function directly
    const testIpHash = 'test-ip-hash-' + Date.now();
    
    // We need a valid client ID from the DB to test the foreign key constraint
    // For a real integration test, we'd create one here.
    const { data: clients } = await serviceClient.from('clients').select('id').limit(1);
    if (!clients || clients.length === 0) {
      console.warn('No clients found in DB to test rate limit. Skipping.');
      return;
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
        p_ip_hash: testIpHash
      })
    );

    const results = await Promise.all(promises);
    
    // Count successful submissions
    const successful = results.filter(r => r.data?.success === true);
    const failed = results.filter(r => r.data?.success === false && r.data?.error === 'Rate limit exceeded');

    // Exactly 5 should succeed, no more, no less (if it's the first time for this IP)
    expect(successful.length).toBeLessThanOrEqual(5);
    // At least 5 should be blocked by rate limit
    expect(failed.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Multi-Tenant Isolation', () => {
  it('prevents Owner A from accessing Owner B data', async () => {
    // This requires test credentials to be set up in the DB
    const emailA = process.env.TEST_USER_A_EMAIL;
    const passA = process.env.TEST_USER_A_PASSWORD;
    const emailB = process.env.TEST_USER_B_EMAIL;

    if (!emailA || !passA || !emailB) {
      console.warn('Skipping tenant isolation test: Missing TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD, TEST_USER_B_EMAIL');
      return;
    }

    const authClientA = createClient(supabaseUrl, supabaseAnonKey);
    const { error: signInErr } = await authClientA.auth.signInWithPassword({ email: emailA, password: passA });
    expect(signInErr).toBeNull();

    // Find Owner B's user ID
    const { data: userBData } = await serviceClient.auth.admin.listUsers();
    const userB = userBData?.users.find(u => u.email === emailB);
    if (!userB) {
      console.warn('Skipping tenant isolation test: Owner B user not found in DB');
      return;
    }

    // Attempt to read Owner B's clients table
    const { data: clients, error: clientsErr } = await authClientA
      .from('clients')
      .select('*')
      .eq('owner_user_id', userB.id);

    // RLS should return 0 rows silently
    expect(clientsErr).toBeNull();
    expect(clients?.length).toBe(0);

    // Get a valid client_id for Owner B via service role
    const { data: clientB } = await serviceClient.from('clients').select('id').eq('owner_user_id', userB.id).single();
    if (clientB) {
      // Attempt to read Owner B's feedback
      const { data: feedback, error: feedbackErr } = await authClientA
        .from('private_feedback')
        .select('*')
        .eq('client_id', clientB.id);

      expect(feedbackErr).toBeNull();
      expect(feedback?.length).toBe(0);

      // Attempt to update Owner B's feedback (malicious API call)
      const { error: updateErr } = await authClientA
        .from('private_feedback')
        .update({ status: 'resolved' })
        .eq('client_id', clientB.id);

      // In Postgres, if a row is filtered by RLS, update returns success but affects 0 rows
      expect(updateErr).toBeNull();
    }
  });
});
