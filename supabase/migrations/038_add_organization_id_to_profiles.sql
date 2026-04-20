-- Migration: Add organization_id to profiles table
-- This allows academic managers to create classes with their organization context

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
