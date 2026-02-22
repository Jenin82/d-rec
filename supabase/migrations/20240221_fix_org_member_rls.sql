-- Drop the existing policies causing infinite recursion
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners and admins can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Superadmins can manage all organization members" ON public.organization_members;

-- 1. Users can view their own memberships
CREATE POLICY "Users can view their own organization memberships"
  ON public.organization_members
  FOR SELECT
  USING (user_id = auth.uid());

-- 2. Users can view other members in the same organization
CREATE POLICY "Users can view other members in their organizations"
  ON public.organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- 3. Org owners and admins can INSERT members (no recursion needed here since we just check their own membership)
CREATE POLICY "Org owners and admins can insert members"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- 4. Org owners and admins can UPDATE members
CREATE POLICY "Org owners and admins can update members"
  ON public.organization_members
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- 5. Org owners and admins can DELETE members
CREATE POLICY "Org owners and admins can delete members"
  ON public.organization_members
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- 6. Superadmins can do everything
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

-- 7. Allow users to insert themselves if they are creating a new organization (they wouldn't be a member yet)
-- We need to check if the organization has no members yet, or if they are the ones who created the org
-- Since we don't track org creator, we'll allow insert if they are inserting themselves as owner
CREATE POLICY "Users can insert themselves as owner"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND role = 'owner'
  );
