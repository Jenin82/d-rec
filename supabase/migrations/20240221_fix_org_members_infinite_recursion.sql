-- 1. Create SECURITY DEFINER functions to safely query memberships without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_orgs()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_admin_orgs()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin');
$$;

-- 2. Drop existing policies on organization_members
DROP POLICY IF EXISTS "Users can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can insert org members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can update org members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can delete org members" ON public.organization_members;
DROP POLICY IF EXISTS "Superadmins have full access to org members" ON public.organization_members;

-- 3. Recreate policies using the SECURITY DEFINER functions to prevent infinite recursion
CREATE POLICY "Users can view org members"
  ON public.organization_members
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    organization_id IN (SELECT public.get_user_orgs())
  );

CREATE POLICY "Users can insert org members"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() AND role = 'owner') OR
    organization_id IN (SELECT public.get_user_admin_orgs())
  );

CREATE POLICY "Owners and admins can update org members"
  ON public.organization_members
  FOR UPDATE
  USING (
    organization_id IN (SELECT public.get_user_admin_orgs())
  );

CREATE POLICY "Owners and admins can delete org members"
  ON public.organization_members
  FOR DELETE
  USING (
    organization_id IN (SELECT public.get_user_admin_orgs())
  );

CREATE POLICY "Superadmins have full access to org members"
  ON public.organization_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'superadmin'
    )
  );
