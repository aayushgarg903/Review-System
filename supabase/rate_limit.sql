CREATE TABLE IF NOT EXISTS rate_limits (
    ip_hash VARCHAR(64) PRIMARY KEY,
    submissions INT NOT NULL DEFAULT 1,
    last_submission TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Drop the old column from private_feedback
ALTER TABLE private_feedback DROP COLUMN IF EXISTS ip_hash;

CREATE OR REPLACE FUNCTION submit_private_feedback_with_rate_limit(
    p_client_id UUID,
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR,
    p_feedback_text TEXT,
    p_consent_given BOOLEAN,
    p_ip_hash VARCHAR(64)
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inserted_id UUID;
    v_submissions INT;
    v_last_submission TIMESTAMPTZ;
BEGIN
    -- Advisory lock to prevent race conditions during rate limit check
    PERFORM pg_advisory_xact_lock(hashtext(p_ip_hash));

    -- Check rate limit
    SELECT submissions, last_submission INTO v_submissions, v_last_submission 
    FROM rate_limits 
    WHERE ip_hash = p_ip_hash 
    FOR UPDATE;

    IF FOUND THEN
        IF v_last_submission < now() - interval '10 minutes' THEN
            -- Reset after 10 minutes
            v_submissions := 1;
        ELSE
            v_submissions := v_submissions + 1;
        END IF;

        IF v_submissions > 5 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded');
        END IF;

        UPDATE rate_limits SET submissions = v_submissions, last_submission = now() WHERE ip_hash = p_ip_hash;
    ELSE
        INSERT INTO rate_limits (ip_hash, submissions) VALUES (p_ip_hash, 1);
    END IF;

    -- Insert feedback (no IP stored here!)
    INSERT INTO private_feedback (client_id, customer_name, customer_phone, feedback_text, consent_given)
    VALUES (p_client_id, p_customer_name, p_customer_phone, p_feedback_text, p_consent_given)
    RETURNING id INTO v_inserted_id;

    RETURN jsonb_build_object('success', true, 'id', v_inserted_id);
END;
$$;
