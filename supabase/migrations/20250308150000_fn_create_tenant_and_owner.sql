CREATE OR REPLACE FUNCTION public.create_tenant_and_owner(
  p_tenant_name TEXT,
  p_tenant_slug TEXT,
  p_allowed_domains TEXT[],
  p_user_id UUID,
  p_user_email TEXT,
  p_owner_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  INSERT INTO public.tenants (name, slug, allowed_domains)
  VALUES (p_tenant_name, p_tenant_slug, p_allowed_domains)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.users (id, tenant_id, email, role)
  VALUES (p_user_id, v_tenant_id, p_user_email, p_owner_role);

  RETURN jsonb_build_object('tenant_id', v_tenant_id);

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_tenant_and_owner FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tenant_and_owner TO service_role;
