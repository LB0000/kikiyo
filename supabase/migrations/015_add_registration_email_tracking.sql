-- メール送信日時を追跡するカラムを追加
ALTER TABLE agencies ADD COLUMN registration_email_sent_at TIMESTAMPTZ;
