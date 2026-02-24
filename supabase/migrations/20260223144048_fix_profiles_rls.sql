-- Drop existing policy if any
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- Create a policy allowing authenticated users to view all profiles.
-- In a more strict system, this might join organization_members, but for this platform the user IDs are shared across contexts.
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);
