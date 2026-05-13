ALTER TABLE purchase_order_settings
  ADD COLUMN IF NOT EXISTS email_body_template text;
