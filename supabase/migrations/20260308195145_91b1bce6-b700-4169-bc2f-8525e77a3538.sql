
-- Approval workflows table
CREATE TABLE public.approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'job', 'course', 'mentor_application', 'recruiter_application'
  entity_id uuid NOT NULL,
  entity_title text NOT NULL,
  submitted_by uuid NOT NULL,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, escalated
  priority text NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  sla_deadline timestamptz,
  escalated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "workflow_admin_all" ON public.approval_workflows FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "workflow_super_admin_all" ON public.approval_workflows FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "workflow_recruitment_admin" ON public.approval_workflows FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'recruitment_admin'::app_role) AND entity_type IN ('job', 'recruiter_application'))
  WITH CHECK (has_role(auth.uid(), 'recruitment_admin'::app_role) AND entity_type IN ('job', 'recruiter_application'));

CREATE POLICY "workflow_learning_admin" ON public.approval_workflows FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'learning_admin'::app_role) AND entity_type IN ('course'))
  WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role) AND entity_type IN ('course'));

CREATE POLICY "workflow_mentorship_admin" ON public.approval_workflows FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'mentorship_admin'::app_role) AND entity_type IN ('mentor_application'))
  WITH CHECK (has_role(auth.uid(), 'mentorship_admin'::app_role) AND entity_type IN ('mentor_application'));

CREATE POLICY "workflow_submitter_select" ON public.approval_workflows FOR SELECT
  TO authenticated USING (submitted_by = auth.uid());

-- Audit log table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL, -- 'approve', 'reject', 'escalate', 'create', 'update', 'delete', 'role_assign', 'bulk_import'
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_admin_select" ON public.audit_logs FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "audit_super_admin_all" ON public.audit_logs FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "audit_admin_insert" ON public.audit_logs FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "audit_module_admin_insert" ON public.audit_logs FOR INSERT
  TO authenticated WITH CHECK (
    has_role(auth.uid(), 'recruitment_admin'::app_role) OR
    has_role(auth.uid(), 'learning_admin'::app_role) OR
    has_role(auth.uid(), 'mentorship_admin'::app_role) OR
    has_role(auth.uid(), 'citizen_db_admin'::app_role)
  );

CREATE POLICY "audit_module_admin_select" ON public.audit_logs FOR SELECT
  TO authenticated USING (
    has_role(auth.uid(), 'recruitment_admin'::app_role) OR
    has_role(auth.uid(), 'learning_admin'::app_role) OR
    has_role(auth.uid(), 'mentorship_admin'::app_role) OR
    has_role(auth.uid(), 'citizen_db_admin'::app_role)
  );

-- Enable realtime for workflows
ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_workflows;
