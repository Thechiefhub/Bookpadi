ALTER TABLE public.profiles ADD COLUMN username TEXT;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_]{3,20}$');
CREATE UNIQUE INDEX profiles_username_lower_unique ON public.profiles (lower(username)) WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NULLIF(lower(btrim(NEW.raw_user_meta_data->>'username')), '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_username_available(_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_username TEXT;
BEGIN
  normalized_username := lower(btrim(coalesce(_username, '')));
  IF normalized_username !~ '^[a-z0-9_]{3,20}$' THEN
    RETURN false;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE lower(p.username) = normalized_username
  );
END;
$$;
REVOKE ALL ON FUNCTION public.is_username_available(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_admin = true
  );
$$;
REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
DROP POLICY IF EXISTS "Authenticated users can count profiles" ON public.profiles;
CREATE POLICY "Owners and admins can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.search_schoolmates(_query TEXT)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  username TEXT,
  department_name TEXT,
  level INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.username, d.name, p.level
  FROM public.profiles me
  JOIN public.profiles p ON p.institution = me.institution
  LEFT JOIN public.departments d ON d.id = p.department_id
  WHERE me.user_id = auth.uid()
    AND me.institution IS NOT NULL
    AND p.user_id <> auth.uid()
    AND char_length(btrim(coalesce(_query, ''))) BETWEEN 2 AND 50
    AND (
      position(lower(btrim(_query)) in lower(coalesce(p.full_name, ''))) > 0
      OR position(lower(btrim(_query)) in lower(coalesce(p.username, ''))) > 0
    )
  ORDER BY p.full_name NULLS LAST, p.username
  LIMIT 25;
$$;
REVOKE ALL ON FUNCTION public.search_schoolmates(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_schoolmates(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_access_direct_message(_sender UUID, _recipient UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND auth.uid() IN (_sender, _recipient)
    AND EXISTS (
      SELECT 1
      FROM public.profiles sender
      JOIN public.profiles recipient ON recipient.institution = sender.institution
      WHERE sender.user_id = _sender
        AND recipient.user_id = _recipient
        AND sender.institution IS NOT NULL
    );
$$;
REVOKE ALL ON FUNCTION public.can_access_direct_message(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_direct_message(UUID, UUID) TO authenticated;

CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  CONSTRAINT direct_messages_body_length CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  CONSTRAINT direct_messages_no_self CHECK (sender_id <> recipient_id)
);
GRANT SELECT, INSERT ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can read schoolmate messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (public.can_access_direct_message(sender_id, recipient_id));
CREATE POLICY "Students can message schoolmates"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.can_access_direct_message(sender_id, recipient_id)
  );
CREATE INDEX direct_messages_conversation_created_idx
  ON public.direct_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX direct_messages_recipient_unread_idx
  ON public.direct_messages (recipient_id, sender_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_message_peers()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  username TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH actor AS (
    SELECT p.institution FROM public.profiles p WHERE p.user_id = auth.uid()
  ), conversation_messages AS (
    SELECT
      CASE WHEN dm.sender_id = auth.uid() THEN dm.recipient_id ELSE dm.sender_id END AS peer_id,
      dm.sender_id,
      dm.recipient_id,
      dm.body,
      dm.created_at,
      dm.id,
      dm.read_at
    FROM public.direct_messages dm
    CROSS JOIN actor a
    JOIN public.profiles peer
      ON peer.user_id = CASE WHEN dm.sender_id = auth.uid() THEN dm.recipient_id ELSE dm.sender_id END
     AND peer.institution = a.institution
    WHERE a.institution IS NOT NULL
      AND (dm.sender_id = auth.uid() OR dm.recipient_id = auth.uid())
  ), latest AS (
    SELECT DISTINCT ON (cm.peer_id) cm.peer_id, cm.body, cm.created_at
    FROM conversation_messages cm
    ORDER BY cm.peer_id, cm.created_at DESC, cm.id DESC
  ), unread AS (
    SELECT cm.peer_id, count(*)::BIGINT AS total
    FROM conversation_messages cm
    WHERE cm.recipient_id = auth.uid() AND cm.read_at IS NULL
    GROUP BY cm.peer_id
  )
  SELECT p.user_id, p.full_name, p.username, latest.body, latest.created_at, coalesce(unread.total, 0)::BIGINT
  FROM latest
  JOIN public.profiles p ON p.user_id = latest.peer_id
  CROSS JOIN actor a
  LEFT JOIN unread ON unread.peer_id = latest.peer_id
  WHERE a.institution IS NOT NULL AND p.institution = a.institution
  ORDER BY latest.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_message_peers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_message_peers() TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_direct_messages_read(_sender_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR _sender_id = auth.uid() THEN
    RETURN 0;
  END IF;
  UPDATE public.direct_messages
  SET read_at = now()
  WHERE sender_id = _sender_id
    AND recipient_id = auth.uid()
    AND read_at IS NULL
    AND public.can_access_direct_message(sender_id, recipient_id);
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_direct_messages_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_direct_messages_read(UUID) TO authenticated;