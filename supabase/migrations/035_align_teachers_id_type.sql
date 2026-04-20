-- ============================================================
-- Migration 035: Align teachers.id type to UUID
-- ============================================================
-- Problem: teachers.id was originally SERIAL (integer) from AG-preview migration.
-- classes.teacher_id is UUID (references profiles.id). Policy comparing
-- teachers.id (integer) with classes.teacher_id (UUID) fails with:
-- "operator does not exist: integer = uuid"
-- Fix: Alter teachers.id from INTEGER to UUID to match the rest of the schema.
-- Since teachers table has no foreign key dependencies, this is safe.
-- Data: teacher records are preserved with newly generated UUIDs.
-- ============================================================

-- Enable uuid extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Drop the existing SERIAL sequence (if exists)
DROP SEQUENCE IF EXISTS teachers_id_seq CASCADE;

-- 2. Alter column type from INTEGER (SERIAL) to UUID, generating new UUIDs for each row
--    ALTER COLUMN TYPE automatically preserves the PRIMARY KEY constraint.
ALTER TABLE public.teachers
  ALTER COLUMN id TYPE UUID USING gen_random_uuid();

-- 3. Set the default for future inserts
ALTER TABLE public.teachers
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ============================================================
-- End Migration 035
-- ============================================================
