import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";

export interface ExamCountdownItem {
  id: string;
  courseCode: string;
  subjectTitle: string;
  examDate: string; // ISO string
  venue?: string;
}

export type GoalCadence = "daily" | "weekly";
export type GoalMetric = "topics" | "minutes";

export interface StudyGoal {
  id: string;
  title: string;
  cadence: GoalCadence;
  metric: GoalMetric;
  target: number;
  current: number;
  updatedAt: string;
}

export interface BadgeItem {
  id: string;
  name: string;
  description: string;
  category: "streak" | "module" | "goal";
  iconName: "flame" | "zap" | "award" | "trophy" | "book" | "check-circle" | "graduation-cap" | "target";
  unlocked: boolean;
  progress: number; // 0 to 100
  progressLabel: string;
}

interface EngagementStore {
  streakDays: number;
  bestStreak: number;
  lastStudyDate: string | null; // YYYY-MM-DD
  completedTopicIds: string[];
  completedCourseIds: string[];
  dailyTopicsCompleted: number;
  weeklyTopicsCompleted: number;
  dailyMinutesStudied: number;
  weeklyMinutesStudied: number;
  lastDailyReset: string; // YYYY-MM-DD
  lastWeeklyReset: string; // YYYY-WW
  goals: StudyGoal[];
  exams: ExamCountdownItem[];
}

const ENGAGEMENT_EVENT = "bookpadi:engagement-updated";

function getTodayStr(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function getWeekStr(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function getDefaultExams(): ExamCountdownItem[] {
  const now = Date.now();
  const fiveDays = new Date(now + 5 * 86400000 + 3 * 3600000).toISOString();
  const twelveDays = new Date(now + 12 * 86400000 + 5 * 3600000).toISOString();
  return [
    {
      id: "exam-default-1",
      courseCode: "CSC 101",
      subjectTitle: "Introduction to Computer Science",
      examDate: fiveDays,
      venue: "ICT Hall A",
    },
    {
      id: "exam-default-2",
      courseCode: "MTH 101",
      subjectTitle: "Elementary Mathematics I",
      examDate: twelveDays,
      venue: "Faculty Lecture Theatre",
    },
  ];
}

function getDefaultGoals(): StudyGoal[] {
  const nowIso = new Date().toISOString();
  return [
    {
      id: "goal-daily-topics",
      title: "Daily Topics Target",
      cadence: "daily",
      metric: "topics",
      target: 3,
      current: 1,
      updatedAt: nowIso,
    },
    {
      id: "goal-daily-minutes",
      title: "Daily Study Time",
      cadence: "daily",
      metric: "minutes",
      target: 90,
      current: 45,
      updatedAt: nowIso,
    },
    {
      id: "goal-weekly-topics",
      title: "Weekly Topics Mastery",
      cadence: "weekly",
      metric: "topics",
      target: 12,
      current: 4,
      updatedAt: nowIso,
    },
    {
      id: "goal-weekly-minutes",
      title: "Weekly Study Hours",
      cadence: "weekly",
      metric: "minutes",
      target: 420,
      current: 180,
      updatedAt: nowIso,
    },
  ];
}

function getStorageKey(userId?: string | null): string {
  return `bookpadi_engagement_v1_${userId || "guest"}`;
}

function loadEngagementStore(userId?: string | null): EngagementStore {
  const today = getTodayStr();
  const week = getWeekStr();
  const defaultStore: EngagementStore = {
    streakDays: 3,
    bestStreak: 5,
    lastStudyDate: getYesterdayStr(),
    completedTopicIds: [],
    completedCourseIds: [],
    dailyTopicsCompleted: 1,
    weeklyTopicsCompleted: 4,
    dailyMinutesStudied: 45,
    weeklyMinutesStudied: 180,
    lastDailyReset: today,
    lastWeeklyReset: week,
    goals: getDefaultGoals(),
    exams: getDefaultExams(),
  };

  if (typeof window === "undefined") return defaultStore;

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return defaultStore;
    const parsed: EngagementStore = { ...defaultStore, ...JSON.parse(raw) };

    // Reset daily counters if date changed
    if (parsed.lastDailyReset !== today) {
      parsed.dailyTopicsCompleted = 0;
      parsed.dailyMinutesStudied = 0;
      parsed.lastDailyReset = today;
      parsed.goals = parsed.goals.map((g) =>
        g.cadence === "daily" ? { ...g, current: 0 } : g
      );
    }

    // Reset weekly counters if week changed
    if (parsed.lastWeeklyReset !== week) {
      parsed.weeklyTopicsCompleted = 0;
      parsed.weeklyMinutesStudied = 0;
      parsed.lastWeeklyReset = week;
      parsed.goals = parsed.goals.map((g) =>
        g.cadence === "weekly" ? { ...g, current: 0 } : g
      );
    }

    return parsed;
  } catch {
    return defaultStore;
  }
}

function saveEngagementStore(userId: string | null | undefined, store: EngagementStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(ENGAGEMENT_EVENT));
  } catch {
    // ignore storage quota errors
  }
}

function applyStreakUpdate(store: EngagementStore): { store: EngagementStore; streakIncremented: boolean } {
  const today = getTodayStr();
  const yesterday = getYesterdayStr();

  if (store.lastStudyDate === today) {
    return { store, streakIncremented: false };
  }

  const nextStreak =
    store.lastStudyDate === yesterday || store.streakDays > 0
      ? store.streakDays + 1
      : 1;
  const nextBest = Math.max(store.bestStreak, nextStreak);

  return {
    store: {
      ...store,
      streakDays: nextStreak,
      bestStreak: nextBest,
      lastStudyDate: today,
    },
    streakIncremented: true,
  };
}

export function useStudentEngagement(userId?: string | null) {
  const [store, setStore] = useState<EngagementStore>(() => loadEngagementStore(userId));

  useEffect(() => {
    setStore(loadEngagementStore(userId));
  }, [userId]);

  useEffect(() => {
    const onSync = () => {
      setStore(loadEngagementStore(userId));
    };
    window.addEventListener(ENGAGEMENT_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(ENGAGEMENT_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [userId]);

  const updateStore = useCallback(
    (updater: (prev: EngagementStore) => EngagementStore) => {
      const current = loadEngagementStore(userId);
      const next = updater(current);
      saveEngagementStore(userId, next);
      setStore(next);
    },
    [userId]
  );

  const checkInStudyStreak = useCallback(() => {
    const current = loadEngagementStore(userId);
    const today = getTodayStr();
    if (current.lastStudyDate === today) {
      toast.info(`You've already checked in today! Current streak: ${current.streakDays} days.`);
      return;
    }
    const { store: nextStore } = applyStreakUpdate(current);
    saveEngagementStore(userId, nextStore);
    setStore(nextStore);
    toast.success(`Study streak extended to ${nextStore.streakDays} days!`);
  }, [userId]);

  const toggleTopicComplete = useCallback(
    (topicId: string, courseId?: string, totalCourseTopics?: number) => {
      updateStore((prev) => {
        const alreadyDone = prev.completedTopicIds.includes(topicId);
        const completedTopicIds = alreadyDone
          ? prev.completedTopicIds.filter((id) => id !== topicId)
          : [...prev.completedTopicIds, topicId];

        let delta = alreadyDone ? -1 : 1;
        const dailyTopicsCompleted = Math.max(0, prev.dailyTopicsCompleted + delta);
        const weeklyTopicsCompleted = Math.max(0, prev.weeklyTopicsCompleted + delta);

        const goals = prev.goals.map((g) => {
          if (g.metric === "topics") {
            return {
              ...g,
              current: Math.max(0, g.current + delta),
              updatedAt: new Date().toISOString(),
            };
          }
          return g;
        });

        let completedCourseIds = [...prev.completedCourseIds];
        if (!alreadyDone && courseId && totalCourseTopics && totalCourseTopics > 0) {
          // If user finished at least totalCourseTopics, or we mark course complete when all topics done
        }

        let updated: EngagementStore = {
          ...prev,
          completedTopicIds,
          completedCourseIds,
          dailyTopicsCompleted,
          weeklyTopicsCompleted,
          goals,
        };

        if (!alreadyDone) {
          updated = applyStreakUpdate(updated).store;
          toast.success("Topic marked as completed! Study goals updated.");
        }

        return updated;
      });
    },
    [updateStore]
  );

  const syncCourseModuleCompletion = useCallback(
    (courseId: string, courseTopicIds: string[], courseCode?: string) => {
      if (!courseId || courseTopicIds.length === 0) return;
      updateStore((prev) => {
        const allTopicsDone = courseTopicIds.every((id) => prev.completedTopicIds.includes(id));
        const wasCourseDone = prev.completedCourseIds.includes(courseId);

        if (allTopicsDone && !wasCourseDone) {
          toast.success(
            `Module Completed: ${courseCode || "Course"}! Check your dashboard badges.`
          );
          return {
            ...prev,
            completedCourseIds: [...prev.completedCourseIds, courseId],
          };
        } else if (!allTopicsDone && wasCourseDone) {
          return {
            ...prev,
            completedCourseIds: prev.completedCourseIds.filter((id) => id !== courseId),
          };
        }
        return prev;
      });
    },
    [updateStore]
  );

  const markCourseModuleComplete = useCallback(
    (courseId: string, topicIds: string[], courseTitle?: string) => {
      updateStore((prev) => {
        const isAlreadyComplete = prev.completedCourseIds.includes(courseId);
        if (isAlreadyComplete) {
          toast.info(`${courseTitle || "Course module"} is already marked complete.`);
          return prev;
        }
        const newlyAddedTopics = topicIds.filter((id) => !prev.completedTopicIds.includes(id));
        const addedCount = Math.max(1, newlyAddedTopics.length);
        const completedTopicIds = Array.from(new Set([...prev.completedTopicIds, ...topicIds]));
        const completedCourseIds = Array.from(new Set([...prev.completedCourseIds, courseId]));

        const goals = prev.goals.map((g) =>
          g.metric === "topics"
            ? { ...g, current: g.current + addedCount, updatedAt: new Date().toISOString() }
            : g
        );

        const withStreak = applyStreakUpdate({
          ...prev,
          completedTopicIds,
          completedCourseIds,
          dailyTopicsCompleted: prev.dailyTopicsCompleted + addedCount,
          weeklyTopicsCompleted: prev.weeklyTopicsCompleted + addedCount,
          goals,
        }).store;

        toast.success(`Completed ${courseTitle || "Course Module"}! Badge progress updated.`);
        return withStreak;
      });
    },
    [updateStore]
  );

  const logStudyMinutes = useCallback(
    (minutes: number) => {
      if (minutes <= 0) return;
      updateStore((prev) => {
        const goals = prev.goals.map((g) =>
          g.metric === "minutes"
            ? { ...g, current: g.current + minutes, updatedAt: new Date().toISOString() }
            : g
        );
        const withStreak = applyStreakUpdate({
          ...prev,
          dailyMinutesStudied: prev.dailyMinutesStudied + minutes,
          weeklyMinutesStudied: prev.weeklyMinutesStudied + minutes,
          goals,
        }).store;
        toast.success(`Logged ${minutes} mins of study time!`);
        return withStreak;
      });
    },
    [updateStore]
  );

  const logCompletedTopicDirect = useCallback(
    (count = 1) => {
      updateStore((prev) => {
        const goals = prev.goals.map((g) =>
          g.metric === "topics"
            ? { ...g, current: Math.max(0, g.current + count), updatedAt: new Date().toISOString() }
            : g
        );
        const withStreak = applyStreakUpdate({
          ...prev,
          dailyTopicsCompleted: Math.max(0, prev.dailyTopicsCompleted + count),
          weeklyTopicsCompleted: Math.max(0, prev.weeklyTopicsCompleted + count),
          goals,
        }).store;
        toast.success(`Logged ${count} completed ${count === 1 ? "topic" : "topics"}!`);
        return withStreak;
      });
    },
    [updateStore]
  );

  const updateGoalTarget = useCallback(
    (goalId: string, newTarget: number, newCurrent?: number) => {
      if (newTarget <= 0) return;
      updateStore((prev) => ({
        ...prev,
        goals: prev.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                target: newTarget,
                current: typeof newCurrent === "number" ? Math.max(0, newCurrent) : g.current,
                updatedAt: new Date().toISOString(),
              }
            : g
        ),
      }));
      toast.success("Study goal updated!");
    },
    [updateStore]
  );

  const addCustomGoal = useCallback(
    (title: string, cadence: GoalCadence, metric: GoalMetric, target: number) => {
      updateStore((prev) => ({
        ...prev,
        goals: [
          ...prev.goals,
          {
            id: `goal-${Date.now()}`,
            title,
            cadence,
            metric,
            target,
            current: 0,
            updatedAt: new Date().toISOString(),
          },
        ],
      }));
      toast.success("New study goal added!");
    },
    [updateStore]
  );

  const removeGoal = useCallback(
    (goalId: string) => {
      updateStore((prev) => ({
        ...prev,
        goals: prev.goals.filter((g) => g.id !== goalId),
      }));
      toast.success("Study goal removed");
    },
    [updateStore]
  );

  const addExam = useCallback(
    (exam: Omit<ExamCountdownItem, "id">) => {
      updateStore((prev) => ({
        ...prev,
        exams: [
          ...prev.exams,
          {
            ...exam,
            id: `exam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          },
        ].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()),
      }));
      toast.success(`Added ${exam.courseCode} exam countdown!`);
    },
    [updateStore]
  );

  const removeExam = useCallback(
    (examId: string) => {
      updateStore((prev) => ({
        ...prev,
        exams: prev.exams.filter((e) => e.id !== examId),
      }));
      toast.success("Exam removed from countdown");
    },
    [updateStore]
  );

  const badges: BadgeItem[] = useMemo(() => {
    const streak = Math.max(store.streakDays, store.bestStreak);
    const topicsCount = Math.max(store.completedTopicIds.length, store.weeklyTopicsCompleted);
    const modulesCount = store.completedCourseIds.length;
    const completedGoalsCount = store.goals.filter((g) => g.current >= g.target && g.target > 0).length;

    return [
      {
        id: "badge-streak-3",
        name: "3-Day Momentum",
        description: "Maintain a 3-day study streak",
        category: "streak",
        iconName: "flame",
        unlocked: streak >= 3,
        progress: Math.min(100, Math.round((streak / 3) * 100)),
        progressLabel: `${Math.min(streak, 3)} / 3 days`,
      },
      {
        id: "badge-streak-7",
        name: "7-Day Consistency",
        description: "Study for 7 consecutive days",
        category: "streak",
        iconName: "zap",
        unlocked: streak >= 7,
        progress: Math.min(100, Math.round((streak / 7) * 100)),
        progressLabel: `${Math.min(streak, 7)} / 7 days`,
      },
      {
        id: "badge-streak-14",
        name: "14-Day Scholar",
        description: "Complete a 2-week study streak",
        category: "streak",
        iconName: "trophy",
        unlocked: streak >= 14,
        progress: Math.min(100, Math.round((streak / 14) * 100)),
        progressLabel: `${Math.min(streak, 14)} / 14 days`,
      },
      {
        id: "badge-topic-5",
        name: "Topic Explorer",
        description: "Complete 5 course topics",
        category: "module",
        iconName: "book",
        unlocked: topicsCount >= 5,
        progress: Math.min(100, Math.round((topicsCount / 5) * 100)),
        progressLabel: `${Math.min(topicsCount, 5)} / 5 topics`,
      },
      {
        id: "badge-module-1",
        name: "Module Finisher",
        description: "Finish all topics in 1 course module",
        category: "module",
        iconName: "check-circle",
        unlocked: modulesCount >= 1,
        progress: Math.min(100, Math.round((modulesCount / 1) * 100)),
        progressLabel: `${Math.min(modulesCount, 1)} / 1 module`,
      },
      {
        id: "badge-module-3",
        name: "Curriculum Master",
        description: "Finish 3 full course modules",
        category: "module",
        iconName: "graduation-cap",
        unlocked: modulesCount >= 3,
        progress: Math.min(100, Math.round((modulesCount / 3) * 100)),
        progressLabel: `${Math.min(modulesCount, 3)} / 3 modules`,
      },
      {
        id: "badge-goal-crusher",
        name: "Goal Crusher",
        description: "Reach 100% on any daily or weekly study goal",
        category: "goal",
        iconName: "target",
        unlocked: completedGoalsCount >= 1,
        progress: completedGoalsCount >= 1 ? 100 : Math.max(...store.goals.map((g) => Math.min(100, Math.round((g.current / Math.max(1, g.target)) * 100))), 0),
        progressLabel: completedGoalsCount >= 1 ? "Goal reached" : `${completedGoalsCount} / 1 goal`,
      },
    ];
  }, [store]);

  const checkedInToday = store.lastStudyDate === getTodayStr();

  return {
    streakDays: store.streakDays,
    bestStreak: store.bestStreak,
    checkedInToday,
    completedTopicIds: store.completedTopicIds,
    completedCourseIds: store.completedCourseIds,
    goals: store.goals,
    exams: store.exams,
    badges,
    checkInStudyStreak,
    toggleTopicComplete,
    syncCourseModuleCompletion,
    markCourseModuleComplete,
    logStudyMinutes,
    logCompletedTopicDirect,
    updateGoalTarget,
    addCustomGoal,
    removeGoal,
    addExam,
    removeExam,
  };
}
