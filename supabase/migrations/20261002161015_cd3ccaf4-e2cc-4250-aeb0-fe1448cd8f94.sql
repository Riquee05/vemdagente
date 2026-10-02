CREATE POLICY request_rate_limits_service_only
ON public.request_rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);