CREATE TABLE IF NOT EXISTS public.org_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'teacher',
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, email)
);

ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage org invites"
  ON public.org_invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

CREATE TABLE IF NOT EXISTS public.classroom_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(classroom_id, email)
);

ALTER TABLE public.classroom_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage classroom invites"
  ON public.classroom_invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin', 'superadmin')
    )
  );

-- Function to handle post-signup logic for invites
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

-- Trigger for checking invites when a user signs up
DROP TRIGGER IF EXISTS on_auth_user_created_invites ON auth.users;
CREATE TRIGGER on_auth_user_created_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_invites();

