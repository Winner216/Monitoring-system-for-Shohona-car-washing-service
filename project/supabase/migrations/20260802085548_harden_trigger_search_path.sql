/*
# Harden trigger functions search_path

Sets an explicit search_path on the two trigger functions to resolve the
"function_search_path_mutable" security advisor warning. No behavior change.
*/

CREATE OR REPLACE FUNCTION public.touch_order_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_order_on_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE orders SET updated_at = now() WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$;
