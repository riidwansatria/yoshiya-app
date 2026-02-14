ALTER TABLE "public"."users"
ADD COLUMN "is_assignable" boolean NOT NULL DEFAULT true,
ADD COLUMN "deleted_at" timestamptz;
