-- Notifications System Migration
-- Adds tables for notification tracking and preferences

-- Notifications log
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'email', 'sms', 'push'
    channel TEXT NOT NULL, -- 'email', 'sms', 'push'
    recipient TEXT NOT NULL, -- email, phone, or user_id
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'delivered'
    subject TEXT,
    body TEXT,
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    provider_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- 'email', 'sms', 'push'
    notification_type TEXT NOT NULL, -- 'invoice', 'payment', 'wallet', 'project', etc.
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, channel, notification_type)
);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_channel ON notification_preferences(channel);


