import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Listener = (event: string, session: any) => void;

function createMockSupabaseClient(): any {
  const STORAGE_KEY = 'bookpadi_mock_db_v1';
  const SESSION_KEY = 'bookpadi_mock_session_v1';
  const listeners = new Set<Listener>();

  const defaultDb = {
    departments: [
      { id: 'dept-csc', name: 'Computer Science', faculty: 'Computing & Informatics', created_at: '2026-01-01T00:00:00Z' },
      { id: 'dept-eee', name: 'Electrical & Electronics Engineering', faculty: 'Engineering', created_at: '2026-01-01T00:00:00Z' },
      { id: 'dept-mcb', name: 'Microbiology', faculty: 'Sciences', created_at: '2026-01-01T00:00:00Z' },
      { id: 'dept-eco', name: 'Economics', faculty: 'Social Sciences', created_at: '2026-01-01T00:00:00Z' },
      { id: 'dept-law', name: 'Law', faculty: 'Law', created_at: '2026-01-01T00:00:00Z' },
      { id: 'dept-med', name: 'Medicine & Surgery', faculty: 'Clinical Sciences', created_at: '2026-01-01T00:00:00Z' },
    ],
    courses: [
      {
        id: 'course-csc101',
        department_id: 'dept-csc',
        level: 100,
        semester: 1,
        course_code: 'CSC 101',
        title: 'Introduction to Computer Science',
        description: 'Foundational concepts of computing systems, binary arithmetic, algorithms, flowcharts, and problem solving.',
        units: 3,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'course-mth101',
        department_id: 'dept-csc',
        level: 100,
        semester: 1,
        course_code: 'MTH 101',
        title: 'Elementary Mathematics I (Algebra & Trigonometry)',
        description: 'Elementary set theory, real numbers, mathematical induction, binomial theorem, complex numbers, and circular measure.',
        units: 3,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'course-csc102',
        department_id: 'dept-csc',
        level: 100,
        semester: 2,
        course_code: 'CSC 102',
        title: 'Introduction to Problem Solving & Programming',
        description: 'Structured programming principles, control structures, functions, arrays, and debugging in Python/C.',
        units: 3,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'course-csc201',
        department_id: 'dept-csc',
        level: 200,
        semester: 1,
        course_code: 'CSC 201',
        title: 'Computer Programming I (Object-Oriented)',
        description: 'Object-oriented design, classes, inheritance, polymorphism, exception handling, and modular programming.',
        units: 3,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'course-csc204',
        department_id: 'dept-csc',
        level: 200,
        semester: 2,
        course_code: 'CSC 204',
        title: 'Data Structures & Algorithms',
        description: 'Arrays, linked lists, stacks, queues, trees, graphs, sorting, searching, and asymptotic complexity analysis.',
        units: 3,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    topics: [
      {
        id: 'topic-csc101-1',
        course_id: 'course-csc101',
        title: 'Number Systems & Binary Arithmetic',
        content: 'Covers conversion between binary, octal, decimal, and hexadecimal number systems, two’s complement representation, and binary addition/subtraction.',
        sort_order: 1,
        external_links: [],
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'topic-csc101-2',
        course_id: 'course-csc101',
        title: 'Computer Architecture & Von Neumann Model',
        content: 'Explores the ALU, Control Unit, Registers, Memory hierarchy (RAM, ROM, Cache), and the fetch-decode-execute cycle.',
        sort_order: 2,
        external_links: [],
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'topic-csc101-3',
        course_id: 'course-csc101',
        title: 'Algorithms, Pseudocode & Flowcharts',
        content: 'Step-by-step problem formulation, control structures (sequence, selection, iteration), and standard flowchart symbols.',
        sort_order: 3,
        external_links: [],
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    profiles: [
      {
        id: 'prof-peer-1',
        user_id: 'user-peer-1',
        full_name: 'Adebayo Ogunlesi',
        username: 'bayo_codes',
        department_id: 'dept-csc',
        institution: 'University of Lagos (UNILAG)',
        level: 200,
        is_admin: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'prof-peer-2',
        user_id: 'user-peer-2',
        full_name: 'Chidinma Okafor',
        username: 'chidinma_o',
        department_id: 'dept-csc',
        institution: 'University of Lagos (UNILAG)',
        level: 100,
        is_admin: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ],
    pins: [] as any[],
    study_plans: [] as any[],
    assignments: [] as any[],
    gpa_records: [] as any[],
    course_registrations: [] as any[],
    direct_messages: [] as any[],
    user_roles: [] as any[],
  };

  const loadDb = () => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) return { ...defaultDb, ...JSON.parse(raw) };
    } catch {
      // ignore storage errors
    }
    return { ...defaultDb };
  };

  const saveDb = (db: typeof defaultDb) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      }
    } catch {
      // ignore storage errors
    }
  };

  const getSessionSync = () => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SESSION_KEY) : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const setSessionSync = (session: any) => {
    try {
      if (typeof window !== 'undefined') {
        if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        else window.localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // ignore
    }
  };

  const createBuilder = (table: keyof typeof defaultDb) => {
    let op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
    let payload: any = null;
    const filters: Array<(row: any) => boolean> = [];
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitCount: number | null = null;
    let isSingle = false;
    let isMaybeSingle = false;

    const execute = async () => {
      const db = loadDb();
      const rows: any[] = Array.isArray(db[table]) ? [...db[table]] : [];

      if (op === 'insert' || op === 'upsert') {
        const items = (Array.isArray(payload) ? payload : [payload]).map((item) => ({
          id: item.id || crypto.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
          ...item,
        }));
        db[table] = [...rows, ...items] as any;
        saveDb(db);
        const result = isSingle || isMaybeSingle ? items[0] ?? null : items;
        return { data: result, error: null, count: items.length };
      }

      const matched = rows.filter((r) => filters.every((f) => f(r)));

      if (op === 'update') {
        const updated: any[] = [];
        db[table] = rows.map((r) => {
          if (filters.every((f) => f(r))) {
            const next = { ...r, ...payload, updated_at: new Date().toISOString() };
            updated.push(next);
            return next;
          }
          return r;
        }) as any;
        saveDb(db);
        const result = isSingle || isMaybeSingle ? updated[0] ?? null : updated;
        return { data: result, error: null, count: updated.length };
      }

      if (op === 'delete') {
        db[table] = rows.filter((r) => !filters.every((f) => f(r))) as any;
        saveDb(db);
        return { data: matched, error: null, count: matched.length };
      }

      let resultRows = [...matched];
      if (orderCol) {
        resultRows.sort((a, b) => {
          const av = a[orderCol!];
          const bv = b[orderCol!];
          if (av < bv) return orderAsc ? -1 : 1;
          if (av > bv) return orderAsc ? 1 : -1;
          return 0;
        });
      }
      if (limitCount !== null) {
        resultRows = resultRows.slice(0, limitCount);
      }

      if (isSingle || isMaybeSingle) {
        return { data: resultRows[0] ?? null, error: null };
      }
      return { data: resultRows, error: null, count: resultRows.length };
    };

    const builder: any = {
      select: () => builder,
      insert: (data: any) => {
        op = 'insert';
        payload = data;
        return builder;
      },
      upsert: (data: any) => {
        op = 'upsert';
        payload = data;
        return builder;
      },
      update: (data: any) => {
        op = 'update';
        payload = data;
        return builder;
      },
      delete: () => {
        op = 'delete';
        return builder;
      },
      eq: (col: string, val: any) => {
        filters.push((r) => r[col] === val);
        return builder;
      },
      neq: (col: string, val: any) => {
        filters.push((r) => r[col] !== val);
        return builder;
      },
      in: (col: string, vals: any[]) => {
        filters.push((r) => Array.isArray(vals) && vals.includes(r[col]));
        return builder;
      },
      ilike: (col: string, pattern: string) => {
        const needle = pattern.replace(/%/g, '').toLowerCase();
        filters.push((r) => String(r[col] ?? '').toLowerCase().includes(needle));
        return builder;
      },
      or: () => builder,
      order: (col: string, opts?: { ascending?: boolean }) => {
        orderCol = col;
        orderAsc = opts?.ascending ?? true;
        return builder;
      },
      limit: (n: number) => {
        limitCount = n;
        return builder;
      },
      single: () => {
        isSingle = true;
        return builder;
      },
      maybeSingle: () => {
        isMaybeSingle = true;
        return builder;
      },
      then: (onFulfilled: any, onRejected: any) => execute().then(onFulfilled, onRejected),
    };

    return builder;
  };

  return {
    from: (table: keyof typeof defaultDb) => createBuilder(table),
    rpc: async (fnName: string, args?: any) => {
      const db = loadDb();
      const session = getSessionSync();
      const currentUserId = session?.user?.id;

      if (fnName === 'is_username_available') {
        const username = String(args?._username ?? '').toLowerCase();
        const taken = db.profiles.some((p: any) => String(p.username ?? '').toLowerCase() === username);
        return { data: !taken, error: null };
      }
      if (fnName === 'search_schoolmates') {
        const q = String(args?._query ?? '').toLowerCase();
        const matches = db.profiles
          .filter((p: any) => p.user_id !== currentUserId)
          .filter(
            (p: any) =>
              String(p.full_name ?? '').toLowerCase().includes(q) ||
              String(p.username ?? '').toLowerCase().includes(q)
          )
          .map((p: any) => ({
            user_id: p.user_id,
            full_name: p.full_name || 'Student',
            username: p.username || 'student',
            department_name: db.departments.find((d: any) => d.id === p.department_id)?.name || 'Computer Science',
            level: p.level || 100,
          }));
        return { data: matches, error: null };
      }
      if (fnName === 'get_message_peers') {
        const peers = db.profiles
          .filter((p: any) => p.user_id !== currentUserId)
          .map((p: any) => ({
            user_id: p.user_id,
            full_name: p.full_name || 'Student',
            username: p.username || 'student',
            last_message: 'Hey! Ready for the upcoming semester exams?',
            last_message_at: new Date().toISOString(),
            unread_count: 0,
          }));
        return { data: peers, error: null };
      }
      if (fnName === 'mark_direct_messages_read') {
        return { data: 0, error: null };
      }
      if (fnName === 'is_current_user_admin' || fnName === 'has_role') {
        return { data: true, error: null };
      }
      if (fnName === 'get_registered_users') {
        return { data: db.profiles, error: null };
      }
      return { data: [], error: null };
    },
    auth: {
      onAuthStateChange: (cb: Listener) => {
        listeners.add(cb);
        return {
          data: {
            subscription: {
              unsubscribe: () => listeners.delete(cb),
            },
          },
        };
      },
      getSession: async () => ({
        data: { session: getSessionSync() },
        error: null,
      }),
      getUser: async () => ({
        data: { user: getSessionSync()?.user ?? null },
        error: null,
      }),
      signUp: async ({ email, options }: any) => {
        const db = loadDb();
        const userId = `user-${Date.now()}`;
        const user = {
          id: userId,
          email,
          user_metadata: options?.data || {},
        };
        const newProfile = {
          id: `prof-${Date.now()}`,
          user_id: userId,
          full_name: options?.data?.full_name || email.split('@')[0],
          username: options?.data?.username || email.split('@')[0],
          department_id: null,
          institution: null,
          level: null,
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.profiles.push(newProfile);
        saveDb(db);
        const session = { access_token: 'mock-token', user };
        setSessionSync(session);
        listeners.forEach((cb) => cb('SIGNED_IN', session));
        return { data: { user, session }, error: null };
      },
      signInWithPassword: async ({ email }: any) => {
        const db = loadDb();
        let existingProfile = db.profiles.find((p: any) => p.email === email);
        const userId = existingProfile?.user_id || `user-${email.replace(/[^a-z0-9]/gi, '')}`;
        if (!existingProfile) {
          existingProfile = {
            id: `prof-${Date.now()}`,
            user_id: userId,
            full_name: email.split('@')[0],
            username: email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            department_id: 'dept-csc',
            institution: 'University of Lagos (UNILAG)',
            level: 200,
            is_admin: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          db.profiles.push(existingProfile);
          saveDb(db);
        }
        const user = { id: userId, email };
        const session = { access_token: 'mock-token', user };
        setSessionSync(session);
        listeners.forEach((cb) => cb('SIGNED_IN', session));
        return { data: { user, session }, error: null };
      },
      signOut: async () => {
        setSessionSync(null);
        listeners.forEach((cb) => cb('SIGNED_OUT', null));
        return { error: null };
      },
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
      updateUser: async () => ({ data: {}, error: null }),
    },
    functions: {
      invoke: async (name: string) => ({
        data: { message: `Mock response from ${name}` },
        error: null,
      }),
    },
    channel: () => {
      const ch: any = {
        on: () => ch,
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: () => {},
  };
}

export const supabase =
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          storage: brokeredPreviewStorage(),
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : (createMockSupabaseClient() as ReturnType<typeof createClient<Database>>);