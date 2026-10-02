CREATE TABLE public.request_rate_limits (
  scope text NOT NULL,
  identifier_hash text NOT NULL CHECK (length(identifier_hash) = 64),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, identifier_hash)
);

GRANT ALL ON public.request_rate_limits TO service_role;

ALTER TABLE public.request_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_request_rate_limit(
  p_scope text,
  p_identifier_hash text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  IF p_scope NOT IN ('help_request', 'volunteer_application', 'assistant_question')
     OR length(p_identifier_hash) <> 64
     OR p_limit < 1
     OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Parâmetros de limitação inválidos.';
  END IF;

  DELETE FROM public.request_rate_limits WHERE expires_at <= now();

  INSERT INTO public.request_rate_limits AS limits (
    scope, identifier_hash, request_count, expires_at, updated_at
  ) VALUES (
    p_scope, p_identifier_hash, 1, now() + make_interval(secs => p_window_seconds), now()
  )
  ON CONFLICT (scope, identifier_hash) DO UPDATE SET
    request_count = CASE
      WHEN limits.expires_at <= now() THEN 1
      ELSE limits.request_count + 1
    END,
    expires_at = CASE
      WHEN limits.expires_at <= now() THEN now() + make_interval(secs => p_window_seconds)
      ELSE limits.expires_at
    END,
    updated_at = now()
  RETURNING request_count INTO current_count;

  RETURN current_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_request_rate_limit(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_request_rate_limit(text, text, integer, integer)
  TO service_role;

DROP POLICY IF EXISTS help_requests_insert ON public.help_requests;
CREATE POLICY help_requests_insert ON public.help_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (requester_id = auth.uid() OR requester_id IS NULL)
    AND status = 'open'
  );

DROP POLICY IF EXISTS "Anyone can submit a volunteer application" ON public.volunteer_applications;
CREATE POLICY "Public can submit pending volunteer applications"
  ON public.volunteer_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND admin_notes IS NULL);