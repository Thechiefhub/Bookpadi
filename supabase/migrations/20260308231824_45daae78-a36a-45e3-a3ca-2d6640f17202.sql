CREATE OR REPLACE FUNCTION public.get_registered_users()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  department_name text,
  level integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.full_name,
    u.email::text,
    d.name AS department_name,
    p.level,
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.departments d ON d.id = p.department_id
  WHERE EXISTS (
    SELECT 1 FROM public.profiles admin
    WHERE admin.user_id = auth.uid() AND admin.is_admin = true
  )
  ORDER BY p.created_at DESC;
$$;