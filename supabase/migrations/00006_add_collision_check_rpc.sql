CREATE OR REPLACE FUNCTION check_global_collision(hashed_domain text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  found_stage "DealStage";
BEGIN
  -- Check if any deal exists for this domain in an advanced stage (NOT INBOX) and is ACTIVE
  SELECT stage INTO found_stage
  FROM "Deal" d
  JOIN "Company" c ON d."companyId" = c.id
  WHERE c."hashedDomain" = hashed_domain
  AND d.stage NOT IN ('INBOX')
  AND d.status = 'ACTIVE'
  LIMIT 1;

  IF found_stage IS NOT NULL THEN
    RETURN json_build_object('collision', true, 'stage', found_stage);
  ELSE
    RETURN json_build_object('collision', false);
  END IF;
END;
$$;
