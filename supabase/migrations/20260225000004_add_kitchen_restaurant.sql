-- Insert kitchen into restaurants table to allow it to be used as a workspace
INSERT INTO "public"."restaurants" (id, name, prefix)
VALUES ('kitchen', 'Kitchen', 'KIT')
ON CONFLICT (id) DO NOTHING;
