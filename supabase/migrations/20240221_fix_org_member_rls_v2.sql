-- Drop the existing policies causing infinite recursion
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view other members in their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners and admins can insert members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners and admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners and admins can delete members" ON public.organization_members;
DROP POLICY IF EXISTS "Superadmins can manage all organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners and admins can manage members" ON public.organization_members;

-- 1. Base Select: Anyone can view themselves, and anyone in an org can view others in that org
CREATE POLICY "Users can view org members"
  ON public.organization_members
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    organization_id IN (
      -- Using a subquery that doesn't reference the outer table row
      SELECT om.organization_id 
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- 2. Insert: Owners/Admins can add others, OR a user can add themselves as owner (e.g. creating a new org)
CREATE POLICY "Users can insert org members"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() AND role = 'owner') OR
    organization_id IN (
      SELECT om.organization_id 
      FROM public.organization_members om
      WHERE om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
    )
  );

-- 3. Update: Owners/Admins can update members
CREATE POLICY "Owners and admins can update org members"
  ON public.organization_members
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM public.organization_members om
      WHERE om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
    )
  );

-- 4. Delete: Owners/Admins can delete members
CREATE POLICY "Owners and admins can delete org members"
  ON public.organization_members
  FOR DELETE
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM public.organization_members om
      WHERE om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
    )
  );

-- 5. Superadmins: Full access
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
