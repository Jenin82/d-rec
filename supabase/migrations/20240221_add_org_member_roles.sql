-- Create an enum for organization roles if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'teacher', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to organization_members
ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS role public.org_role NOT NULL DEFAULT 'student';

-- Update the handle_new_user_invites trigger to use the new org_role
CREATE OR REPLACE FUNCTION public.handle_new_user_invites()
RETURNS TRIGGER AS $$
DECLARE
  v_org_invite record;
  v_class_invite record;
BEGIN
  -- 1. Check for org invites
  FOR v_org_invite IN SELECT * FROM public.org_invites WHERE email = NEW.email
  LOOP
    -- Add to organization_members with the invited role
    -- Note: we cast the invite role to org_role. Assuming invite roles align with org_roles.
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_invite.organization_id, NEW.id, v_org_invite.role::text::public.org_role)
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET role = EXCLUDED.role;

    -- Delete the invite after claiming
    DELETE FROM public.org_invites WHERE id = v_org_invite.id;
  END LOOP;

  -- 2. Check for classroom invites (students)
  FOR v_class_invite IN SELECT * FROM public.classroom_invites WHERE email = NEW.email
  LOOP
    -- Add to classroom_members
    INSERT INTO public.classroom_members (classroom_id, user_id, role)
    VALUES (v_class_invite.classroom_id, NEW.id, 'student')
    ON CONFLICT DO NOTHING;
    
    -- Ensure they are also in the organization as a student
    INSERT INTO public.organization_members (organization_id, user_id, role)
    SELECT organization_id, NEW.id, 'student'
    FROM public.classrooms 
    WHERE id = v_class_invite.classroom_id
    ON CONFLICT DO NOTHING;

    -- Delete the invite after claiming
    DELETE FROM public.classroom_invites WHERE id = v_class_invite.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for organization_members based on the new role column
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;

CREATE POLICY "Users can view their own organization memberships"
  ON public.organization_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow org owners and admins to manage members in their orgs
CREATE POLICY "Org owners and admins can manage members"
  ON public.organization_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
      AND organization_id = public.organization_members.organization_id
      AND role IN ('owner', 'admin')
    )
  );

-- Superadmins can do everything
CREATE POLICY "Superadmins can manage all organization members"
  ON public.organization_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'superadmin'
    )
  );
