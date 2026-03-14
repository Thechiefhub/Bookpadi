
-- GPA records table
CREATE TABLE public.gpa_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_code TEXT NOT NULL,
  course_title TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 3,
  grade TEXT NOT NULL,
  semester INTEGER NOT NULL DEFAULT 1,
  level INTEGER NOT NULL DEFAULT 100,
  session TEXT NOT NULL DEFAULT '2024/2025',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.gpa_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own gpa_records" ON public.gpa_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Assignments table
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  course_code TEXT,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own assignments" ON public.assignments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Course registrations table
CREATE TABLE public.course_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_code TEXT NOT NULL,
  course_title TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 3,
  semester INTEGER NOT NULL DEFAULT 1,
  level INTEGER NOT NULL DEFAULT 100,
  session TEXT NOT NULL DEFAULT '2024/2025',
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.course_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own course_registrations" ON public.course_registrations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
