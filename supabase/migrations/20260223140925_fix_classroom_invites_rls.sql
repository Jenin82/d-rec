-- Drop the old policy
DROP POLICY IF EXISTS "Teachers can manage classroom invites" ON public.classroom_invites;

-- Create the new policy based on organization membership and classroom membership
CREATE POLICY "Teachers can manage classroom invites"
  ON public.classroom_invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      JOIN public.organization_members om ON c.organization_id = om.organization_id
      WHERE c.id = classroom_invites.classroom_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id = classroom_invites.classroom_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'teacher'
    )
  );
