import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search as SearchIcon, BookOpen, FileText, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CourseResult {
  id: string;
  course_code: string;
  title: string;
  units: number;
  departments: { name: string } | null;
}

interface TopicResult {
  id: string;
  title: string;
  content: string | null;
  courses: { id: string; course_code: string; title: string } | null;
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<CourseResult[]>([]);
  const [topics, setTopics] = useState<TopicResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setCourses([]);
      setTopics([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);

    const pattern = `%${trimmed}%`;
    const [coursesRes, topicsRes] = await Promise.all([
      supabase
        .from("courses")
        .select("id, course_code, title, units, departments(name)")
        .or(`title.ilike.${pattern},course_code.ilike.${pattern}`)
        .order("course_code")
        .limit(20),
      supabase
        .from("topics")
        .select("id, title, content, courses(id, course_code, title)")
        .ilike("title", pattern)
        .order("title")
        .limit(20),
    ]);

    setCourses((coursesRes.data as unknown as CourseResult[]) || []);
    setTopics((topicsRes.data as unknown as TopicResult[]) || []);
    setLoading(false);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 350);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const totalResults = courses.length + topics.length;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SearchIcon className="w-6 h-6 text-primary" /> Search
          </h1>
          <p className="text-muted-foreground mt-1">Find courses and topics across all departments</p>
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by course code, course title, or topic name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-base"
            autoFocus
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && searched && totalResults === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </CardContent>
          </Card>
        )}

        {!loading && courses.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Courses ({courses.length})
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {courses.map((course) => (
                <Link key={course.id} to={`/course/${course.id}`}>
                  <Card className="hover:shadow-elevated transition-all hover:border-primary/30 cursor-pointer group h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <Badge variant="secondary" className="text-xs font-mono">
                          {course.course_code}
                        </Badge>
                        <Badge variant="outline">{course.units} units</Badge>
                      </div>
                      <CardTitle className="text-base mt-2 group-hover:text-primary transition-colors">
                        {course.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="truncate">{course.departments?.name}</span>
                        <ChevronRight className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!loading && topics.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Topics ({topics.length})
            </h2>
            <div className="space-y-2">
              {topics.map((topic) => (
                <Link
                  key={topic.id}
                  to={topic.courses ? `/course/${topic.courses.id}` : "#"}
                >
                  <Card className="hover:shadow-elevated transition-all hover:border-primary/30 cursor-pointer group">
                    <CardContent className="py-3 flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                          {topic.title}
                        </p>
                        {topic.courses && (
                          <p className="text-xs text-muted-foreground truncate">
                            <span className="font-mono">{topic.courses.course_code}</span> · {topic.courses.title}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Start typing to search across all courses and topics</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
