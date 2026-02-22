CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization memberships"
  ON public.organization_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage organization members"
  ON public.organization_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Update the handle_new_user_invites trigger function to also add teachers to organization_members
CREATE OR REPLACE FUNCTION public.handle_new_user_invites()
RETURNS TRIGGER AS $$
DECLARE
  v_org_invite record;
  v_class_invite record;
BEGIN
  -- 1. Check for org invites (teachers)
  FOR v_org_invite IN SELECT * FROM public.org_invites WHERE email = NEW.email
  LOOP
    -- Update profile role
    UPDATE public.profiles SET role = v_org_invite.role WHERE id = NEW.id;
    
    -- Add to organization_members
    INSERT INTO public.organization_members (organization_id, user_id)
    VALUES (v_org_invite.organization_id, NEW.id)
    ON CONFLICT DO NOTHING;

    -- Optionally, delete the invite after claiming
    DELETE FROM public.org_invites WHERE id = v_org_invite.id;
  END LOOP;

  -- 2. Check for classroom invites (students)
  FOR v_class_invite IN SELECT * FROM public.classroom_invites WHERE email = NEW.email
  LOOP
    -- Add to classroom_members
    INSERT INTO public.classroom_members (classroom_id, user_id, role)
    VALUES (v_class_invite.classroom_id, NEW.id, 'student')
    ON CONFLICT DO NOTHING;
    
    -- Delete the invite after claiming
    DELETE FROM public.classroom_invites WHERE id = v_class_invite.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
