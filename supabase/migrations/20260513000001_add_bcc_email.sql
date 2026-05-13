ALTER TABLE purchase_order_settings
  ADD COLUMN IF NOT EXISTS bcc_email text;
