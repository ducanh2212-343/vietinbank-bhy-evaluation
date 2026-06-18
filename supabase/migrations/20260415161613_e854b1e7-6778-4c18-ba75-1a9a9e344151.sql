
-- Create registration request status type
CREATE TYPE public.registration_status AS ENUM ('pending', 'approved', 'rejected');

-- Create registration_requests table
CREATE TABLE public.registration_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  security_code_entered TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  position_id UUID REFERENCES public.positions(id),
  note TEXT,
  requested_role public.app_role NOT NULL DEFAULT 'employee',
  status public.registration_status NOT NULL DEFAULT 'pending',
  review_comment TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_auth_user_id UUID,
  created_profile_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert registration requests
CREATE POLICY "Anyone can submit registration request"
ON public.registration_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins can view all requests
CREATE POLICY "Admins can view all registration requests"
ON public.registration_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  has_role(auth.uid(), 'bgd'::app_role) OR
  has_role(auth.uid(), 'tcth_admin'::app_role)
);

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update registration requests"
ON public.registration_requests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  has_role(auth.uid(), 'bgd'::app_role) OR
  has_role(auth.uid(), 'tcth_admin'::app_role)
);

-- Unique constraint to prevent duplicate pending requests
CREATE UNIQUE INDEX idx_unique_pending_email
ON public.registration_requests (email)
WHERE status = 'pending';

-- Timestamp trigger
CREATE TRIGGER update_registration_requests_updated_at
BEFORE UPDATE ON public.registration_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
