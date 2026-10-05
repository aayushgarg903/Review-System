DROP FUNCTION IF EXISTS public.submit_private_feedback_with_rate_limit(UUID, VARCHAR, BOOLEAN, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.submit_private_feedback_with_rate_limit(UUID, VARCHAR, VARCHAR, TEXT, BOOLEAN, VARCHAR);
DROP TABLE IF EXISTS public.rate_limits;

CREATE TABLE IF NOT EXISTS rate_limits (
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    ip_hash VARCHAR(64) NOT NULL,
    submissions INT NOT NULL DEFAULT 1,
    last_submission TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (client_id, ip_hash)
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION submit_private_feedback_with_rate_limit(
    p_client_id UUID,
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR,
    p_feedback_text TEXT,
    p_consent_given BOOLEAN,
    p_ip_hash VARCHAR(64)
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_inserted_id UUID;
    v_submissions INT;
    v_last_submission TIMESTAMPTZ;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(p_client_id::text || p_ip_hash));

    SELECT submissions, last_submission INTO v_submissions, v_last_submission 
    FROM rate_limits 
    WHERE client_id = p_client_id AND ip_hash = p_ip_hash 
    FOR UPDATE;

    IF FOUND THEN
        IF v_last_submission < now() - interval '10 minutes' THEN
            v_submissions := 1;
        ELSE
            v_submissions := v_submissions + 1;
        END IF;

        IF v_submissions > 5 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded');
        END IF;

        UPDATE rate_limits SET submissions = v_submissions, last_submission = now() WHERE client_id = p_client_id AND ip_hash = p_ip_hash;
    ELSE
        INSERT INTO rate_limits (client_id, ip_hash, submissions) VALUES (p_client_id, p_ip_hash, 1);
    END IF;

    INSERT INTO private_feedback (client_id, customer_name, customer_phone, feedback_text, consent_given)
    VALUES (p_client_id, p_customer_name, p_customer_phone, p_feedback_text, p_consent_given)
    RETURNING id INTO v_inserted_id;

    RETURN jsonb_build_object('success', true, 'id', v_inserted_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_private_feedback_with_rate_limit(uuid, varchar, varchar, text, boolean, varchar) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_private_feedback_with_rate_limit(uuid, varchar, varchar, text, boolean, varchar) FROM anon;
REVOKE ALL ON FUNCTION public.submit_private_feedback_with_rate_limit(uuid, varchar, varchar, text, boolean, varchar) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_private_feedback_with_rate_limit(uuid, varchar, varchar, text, boolean, varchar) TO service_role;
