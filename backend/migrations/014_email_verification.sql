-- Add subscription tracking to users
ALTER TABLE users
ADD COLUMN subscription_tier VARCHAR(32) NOT NULL DEFAULT 'free';
-- 'free', 'pro', 'supporter'
ALTER TABLE users
ADD COLUMN subscription_status VARCHAR(32) NOT NULL DEFAULT 'active';
-- 'active', 'canceled', 'past_due'
ALTER TABLE users
ADD COLUMN subscription_expires_at TIMESTAMP;
ALTER TABLE users
ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE users
ADD COLUMN stripe_subscription_id VARCHAR(255);
-- Daily usage tracking (already designed for quota checking)
CREATE TABLE IF NOT EXISTS user_ai_daily_usage (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_count INTEGER NOT NULL DEFAULT 1,
    last_request_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, usage_date)
);

-- Add email verification support to users
ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Email verification codes and link tokens
CREATE TABLE IF NOT EXISTS email_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_ver_user ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_ver_token ON email_verifications(token);