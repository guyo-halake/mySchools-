CREATE TABLE IF NOT EXISTS public.fee_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  method TEXT NOT NULL CHECK (method IN ('MPESA_STK', 'BANK_PAYBILL', 'CHEQUE')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  account_ref TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'POSTED')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_payment_requests_school_student
  ON public.fee_payment_requests (school_id, student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fee_payment_requests_status
  ON public.fee_payment_requests (school_id, status);

CREATE OR REPLACE FUNCTION public.set_fee_payment_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fee_payment_requests_updated_at ON public.fee_payment_requests;
CREATE TRIGGER trg_fee_payment_requests_updated_at
BEFORE UPDATE ON public.fee_payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_fee_payment_requests_updated_at();

ALTER TABLE public.fee_payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fee_payment_requests_select_own_school ON public.fee_payment_requests;
DROP POLICY IF EXISTS fee_payment_requests_insert_own_school ON public.fee_payment_requests;
DROP POLICY IF EXISTS fee_payment_requests_update_own_school ON public.fee_payment_requests;

CREATE POLICY fee_payment_requests_select_own_school
  ON public.fee_payment_requests
  FOR SELECT
  USING (school_id = public.current_user_school_id());

CREATE POLICY fee_payment_requests_insert_own_school
  ON public.fee_payment_requests
  FOR INSERT
  WITH CHECK (school_id = public.current_user_school_id());

CREATE POLICY fee_payment_requests_update_own_school
  ON public.fee_payment_requests
  FOR UPDATE
  USING (school_id = public.current_user_school_id())
  WITH CHECK (school_id = public.current_user_school_id());
