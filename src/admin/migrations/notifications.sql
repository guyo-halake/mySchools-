-- Migration: Create in_app_notifications table
-- This table powers the principal's institutional notification system

CREATE TABLE IF NOT EXISTS public.in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
    link TEXT, -- Optional path to navigate to when clicked
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications" 
ON public.in_app_notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)" 
ON public.in_app_notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
ON public.in_app_notifications FOR INSERT 
WITH CHECK (true); -- Usually inserted by service role or triggered logic

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON public.in_app_notifications(school_id);
