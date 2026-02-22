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

DROP TRIGGER IF EXISTS on_auth_user_created_invites ON auth.users;
CREATE TRIGGER on_auth_user_created_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_invites();
