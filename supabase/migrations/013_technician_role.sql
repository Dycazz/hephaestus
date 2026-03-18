-- 013_technician_role.sql

-- 1. Add technician_id to invitations to link an invite to a specific technician record
ALTER TABLE public.invitations
  ADD COLUMN technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL;

-- 2. Update the role check constraint on invitations
ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_role_check;

ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_role_check CHECK (role IN ('dispatcher', 'viewer', 'technician'));

-- 3. Add profile_id to technicians to link back to the auth user
ALTER TABLE public.technicians
  ADD COLUMN profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Update Row Level Security (RLS) for appointments
-- We need to restrict technicians to seeing ONLY their own appointments (if they are a technician)
-- and prevent them from updating/deleting anything.

-- Drop existing policies
DROP POLICY IF EXISTS "org members can read appointments" ON public.appointments;
DROP POLICY IF EXISTS "org members can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "org members can delete appointments" ON public.appointments;

-- Helper function to get the current user's role and linked technician_id
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS TABLE (role text, technician_id uuid) LANGUAGE sql STABLE AS $$
  SELECT p.role, t.id
  FROM public.profiles p
  LEFT JOIN public.technicians t ON t.profile_id = p.id
  WHERE p.id = auth.uid();
$$;

-- New SELECT policy: 
-- - Owners/Dispatchers/Viewers see everything in the org
-- - Technicians see only their assigned jobs
CREATE POLICY "org members can read appointments"
  ON public.appointments FOR SELECT
  USING (
    org_id = auth_org_id() AND (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (role IN ('owner', 'dispatcher', 'viewer') OR (
          role = 'technician' AND appointments.technician_id = (SELECT id FROM public.technicians WHERE profile_id = auth.uid())
        ))
      )
    )
  );

-- New UPDATE policy: Only owners and dispatchers
CREATE POLICY "org members can update appointments"
  ON public.appointments FOR UPDATE
  USING (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

-- New DELETE policy: Only owners and dispatchers
CREATE POLICY "org members can delete appointments"
  ON public.appointments FOR DELETE
  USING (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

-- New INSERT policy: Only owners and dispatchers
DROP POLICY IF EXISTS "org members can insert appointments" ON public.appointments;
CREATE POLICY "org members can insert appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );
