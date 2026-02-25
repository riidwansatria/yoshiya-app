ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS "is_assignable" boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;
