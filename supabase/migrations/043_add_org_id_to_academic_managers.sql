-- Migration 043: Fix organization_id references and update academic_manager org
-- Problem: profiles.organization_id references organizations(id), not auth.users(id)
-- Step 1: Get the real organization UUID
-- Step 2: Fix admin's organization_id if it's wrong
-- Step 3: Update academic_manager profiles to use the correct org

DO $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get the organization's real UUID
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'glocal-ielts' LIMIT 1;

  -- If no org exists, create one
  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug)
    VALUES ('Glocal IELTS', 'glocal-ielts')
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO v_org_id;
  END IF;

  -- Fix any profiles that have an invalid organization_id (pointing to auth.users instead of organizations)
  UPDATE public.profiles
  SET organization_id = v_org_id
  WHERE organization_id IS NOT NULL
    AND organization_id NOT IN (SELECT id FROM public.organizations);

  -- Now update academic_manager profiles to have the correct org
  UPDATE public.profiles
  SET organization_id = v_org_id
  WHERE role = 'academic_manager' AND (organization_id IS NULL OR organization_id NOT IN (SELECT id FROM public.organizations));

END $$;
