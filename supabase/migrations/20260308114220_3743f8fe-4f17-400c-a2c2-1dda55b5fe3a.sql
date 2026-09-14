
-- Fix: Allow recruiters to update job application status
CREATE POLICY "Recruiters can update applications"
ON public.job_applications
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'recruiter'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix: Allow system/admin to insert notifications
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow authenticated users to insert notifications for themselves (e.g. via triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
