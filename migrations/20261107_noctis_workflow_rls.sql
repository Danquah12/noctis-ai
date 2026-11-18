-- Enforce tenant isolation inside PostgreSQL for all workflow control-plane tables.
-- Application transactions MUST set app.tenant_id with set_config(..., true)
-- using a tenant identifier derived from authenticated server identity.
-- This migration deliberately does not create/grant application roles; deployment
-- must grant only the required table privileges to its non-owner application role.

ALTER TABLE noctis_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE noctis_workflows FORCE ROW LEVEL SECURITY;
ALTER TABLE noctis_workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE noctis_workflow_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE noctis_workflow_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE noctis_workflow_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE noctis_workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE noctis_workflow_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS noctis_workflows_tenant_isolation ON noctis_workflows;
CREATE POLICY noctis_workflows_tenant_isolation ON noctis_workflows
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

DROP POLICY IF EXISTS noctis_workflow_tasks_tenant_isolation ON noctis_workflow_tasks;
CREATE POLICY noctis_workflow_tasks_tenant_isolation ON noctis_workflow_tasks
  USING (EXISTS (
    SELECT 1 FROM noctis_workflows w
    WHERE w.workflow_id = noctis_workflow_tasks.workflow_id
      AND w.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM noctis_workflows w
    WHERE w.workflow_id = noctis_workflow_tasks.workflow_id
      AND w.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')
  ));

DROP POLICY IF EXISTS noctis_workflow_attempts_tenant_isolation ON noctis_workflow_attempts;
CREATE POLICY noctis_workflow_attempts_tenant_isolation ON noctis_workflow_attempts
  USING (EXISTS (
    SELECT 1 FROM noctis_workflows w
    WHERE w.workflow_id = noctis_workflow_attempts.workflow_id
      AND w.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM noctis_workflows w
    WHERE w.workflow_id = noctis_workflow_attempts.workflow_id
      AND w.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')
  ));

DROP POLICY IF EXISTS noctis_workflow_events_tenant_isolation ON noctis_workflow_events;
CREATE POLICY noctis_workflow_events_tenant_isolation ON noctis_workflow_events
  USING (EXISTS (
    SELECT 1 FROM noctis_workflows w
    WHERE w.workflow_id = noctis_workflow_events.workflow_id
      AND w.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM noctis_workflows w
    WHERE w.workflow_id = noctis_workflow_events.workflow_id
      AND w.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')
  ));
