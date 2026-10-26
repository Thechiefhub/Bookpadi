import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText,
  Upload,
  Search,
  Download,
  Eye,
  ThumbsUp,
  Tag,
  Plus,
  BookOpen,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

export type ResourceCategory = "lecture_notes" | "past_questions" | "cheat_sheet" | "lab_manual";

export interface SharedResourceItem {
  id: string;
  title: string;
  courseCode: string;
  department: string;
  level: number;
  category: ResourceCategory;
  fileName: string;
  fileSize: string;
  uploadedBy: string;
  uploadedAt: string;
  tags: string[];
  upvotes: number;
  upvotedByMe?: boolean;
  previewContent: string;
  fileDataUrl?: string;
}

interface SharedResourceLibraryWidgetProps {
  userId?: string;
  userName?: string | null;
  userDepartment?: string | null;
  userLevel?: number | null;
  courses?: Array<{ id: string; course_code: string; title: string }>;
}

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  lecture_notes: "PDF Lecture Notes",
  past_questions: "Past Questions",
  cheat_sheet: "Summary Sheet",
  lab_manual: "Lab Manual",
};

const INITIAL_RESOURCES: SharedResourceItem[] = [
  {
    id: "res-1",
    title: "CSC 101 Complete Lecture Notes: Number Systems, Logic Gates & Von Neumann Model",
    courseCode: "CSC 101",
    department: "Computer Science",
    level: 100,
    category: "lecture_notes",
    fileName: "CSC101_Complete_Lecture_Notes_CCMAS.pdf",
    fileSize: "1.8 MB",
    uploadedBy: "Adebayo Ogunlesi",
    uploadedAt: "2 days ago",
    tags: ["Binary Arithmetic", "2s Complement", "Von Neumann", "First Semester"],
    upvotes: 64,
    previewContent: `CSC 101 — INTRODUCTION TO COMPUTER SCIENCE (LECTURE NOTES SUMMARY)

1. NUMBER SYSTEMS & BASE CONVERSIONS
- Binary (Base 2), Octal (Base 8), Decimal (Base 10), Hexadecimal (Base 16).
- Fractional conversion: Multiply fractional part repeatedly by target base and record integer parts.
- Two's Complement Subtraction:
  Step 1: Find the 1's complement of the subtrahend (invert 0s and 1s).
  Step 2: Add 1 to the LSB to obtain the 2's complement.
  Step 3: Add to the minuend; discard any final carry-out bit.

2. VON NEUMANN ARCHITECTURE
- Central Processing Unit (ALU + Control Unit + General Purpose Registers).
- Fetch-Decode-Execute Cycle:
  • Program Counter (PC) holds address of next instruction.
  • Instruction fetched into Instruction Register (IR) via Memory Buffer Register (MBR).
  • Control Unit decodes opcode and dispatches control signals.`,
  },
  {
    id: "res-2",
    title: "MTH 101 Past Questions & Worked Solutions (2020–2025 Omnibus)",
    courseCode: "MTH 101",
    department: "Computer Science",
    level: 100,
    category: "past_questions",
    fileName: "MTH101_Past_Questions_2020_2025_Solved.pdf",
    fileSize: "2.4 MB",
    uploadedBy: "Chidinma Okafor",
    uploadedAt: "4 days ago",
    tags: ["Past Questions", "Mathematical Induction", "Binomial Theorem", "Complex Numbers"],
    upvotes: 92,
    previewContent: `MTH 101 — ELEMENTARY MATHEMATICS I (SOLVED PAST QUESTIONS)

QUESTION 1 (2024 Exam, Section A):
Prove by mathematical induction that for all positive integers n:
1 + 2 + 3 + ... + n = n(n + 1) / 2.

SOLUTION:
• Base Case (n = 1): LHS = 1, RHS = 1(1 + 1)/2 = 1. Holds true.
• Inductive Hypothesis: Assume true for n = k:
  1 + 2 + ... + k = k(k + 1) / 2.
• Inductive Step (n = k + 1):
  Add (k + 1) to both sides:
  LHS = k(k + 1)/2 + (k + 1) = (k + 1)(k + 2) / 2.
  Hence true for all n >= 1.

QUESTION 2 (2023 Exam):
Find the coefficient of x^4 in the expansion of (2x - 3/x)^8.`,
  },
  {
    id: "res-3",
    title: "CSC 204 Data Structures & Big-O Complexity Quick Reference Sheet",
    courseCode: "CSC 204",
    department: "Computer Science",
    level: 200,
    category: "cheat_sheet",
    fileName: "CSC204_BigO_Sorting_Trees_Reference.pdf",
    fileSize: "940 KB",
    uploadedBy: "Ibrahim Danjuma",
    uploadedAt: "1 week ago",
    tags: ["Big-O", "Sorting", "Binary Trees", "Mid-Semester Test"],
    upvotes: 47,
    previewContent: `CSC 204 — DATA STRUCTURES & ALGORITHMS CHEAT SHEET

TIME COMPLEXITY SUMMARY:
- Array Access: O(1) | Search: O(n) | Insertion: O(n)
- Singly Linked List Head Insert: O(1) | Search: O(n)
- Binary Search Tree (Balanced): Lookup/Insert/Delete O(log n)
- Merge Sort: O(n log n) worst-case, O(n) auxiliary space
- Quick Sort: O(n log n) average, O(n^2) worst-case, in-place`,
  },
  {
    id: "res-4",
    title: "ECO 101 Principles of Microeconomics Past Objective & Theory Bank",
    courseCode: "ECO 101",
    department: "Economics",
    level: 100,
    category: "past_questions",
    fileName: "ECO101_Exam_Bank_With_Marking_Guide.pdf",
    fileSize: "1.5 MB",
    uploadedBy: "Ngozi Eze",
    uploadedAt: "5 days ago",
    tags: ["Elasticity", "Utility Theory", "Market Structures", "Past Questions"],
    upvotes: 38,
    previewContent: `ECO 101 — PRINCIPLES OF MICROECONOMICS PAST QUESTION BANK

1. Define Price Elasticity of Demand (PED) and distinguish between point elasticity and arc elasticity.
2. When the price of commodity X rises from ₦400 to ₦500, quantity demanded falls from 120 units to 90 units. Calculate the arc elasticity of demand and interpret whether demand is elastic or inelastic.`,
  },
];

export default function SharedResourceLibraryWidget({
  userId,
  userName,
  userDepartment,
  userLevel,
  courses = [],
}: SharedResourceLibraryWidgetProps) {
  const storageKey = `bookpadi_shared_library_v1_${userId || "guest"}`;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [resources, setResources] = useState<SharedResourceItem[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return INITIAL_RESOURCES;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ResourceCategory>("all");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [previewItem, setPreviewItem] = useState<SharedResourceItem | null>(null);
  const [taggingId, setTaggingId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");

  // Upload form state
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [category, setCategory] = useState<ResourceCategory>("lecture_notes");
  const [tagsInput, setTagsInput] = useState("");
  const [notesSummary, setNotesSummary] = useState("");
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    dataUrl?: string;
  } | null>(null);

  const saveResources = (next: SharedResourceItem[]) => {
    setResources(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const kb = Math.max(1, Math.round(file.size / 1024));
    const sizeStr = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " "));
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        size: sizeStr,
        dataUrl: typeof reader.result === "string" ? reader.result : undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseCode.trim()) {
      toast.error("Please enter a resource title and course code.");
      return;
    }

    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const newResource: SharedResourceItem = {
      id: `res-${Date.now()}`,
      title: title.trim(),
      courseCode: courseCode.trim().toUpperCase(),
      department: userDepartment || "Computer Science",
      level: userLevel || 100,
      category,
      fileName:
        selectedFile?.name ||
        `${courseCode.trim().toUpperCase().replace(/\s+/g, "")}_${category}.pdf`,
      fileSize: selectedFile?.size || "1.2 MB",
      uploadedBy: userName || "You",
      uploadedAt: "Just now",
      tags: parsedTags.length > 0 ? parsedTags : [CATEGORY_LABELS[category]],
      upvotes: 1,
      upvotedByMe: true,
      previewContent:
        notesSummary.trim() ||
        `${title.trim()} (${courseCode.trim().toUpperCase()})\nUploaded by ${
          userName || "Student"
        }.\nTags: ${(parsedTags.length ? parsedTags : [CATEGORY_LABELS[category]]).join(", ")}`,
      fileDataUrl: selectedFile?.dataUrl,
    };

    saveResources([newResource, ...resources]);
    setTitle("");
    setCourseCode("");
    setTagsInput("");
    setNotesSummary("");
    setSelectedFile(null);
    setShowUploadForm(false);
    toast.success("Academic resource uploaded to the shared campus library!");
  };

  const handleUpvote = (id: string) => {
    const next = resources.map((r) => {
      if (r.id !== id) return r;
      const already = Boolean(r.upvotedByMe);
      return {
        ...r,
        upvotes: already ? Math.max(0, r.upvotes - 1) : r.upvotes + 1,
        upvotedByMe: !already,
      };
    });
    saveResources(next);
  };

  const handleAddTag = (resourceId: string) => {
    const cleaned = newTagInput.trim();
    if (!cleaned) return;
    const next = resources.map((r) => {
      if (r.id !== resourceId) return r;
      if (r.tags.some((t) => t.toLowerCase() === cleaned.toLowerCase())) return r;
      return { ...r, tags: [...r.tags, cleaned] };
    });
    saveResources(next);
    setNewTagInput("");
    setTaggingId(null);
    toast.success(`Tagged resource with "${cleaned}"`);
  };

  const handleDownload = (item: SharedResourceItem) => {
    if (item.fileDataUrl) {
      const a = document.createElement("a");
      a.href = item.fileDataUrl;
      a.download = item.fileName;
      a.click();
      toast.success(`Downloading ${item.fileName}`);
      return;
    }
    const blob = new Blob([item.previewContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.fileName.replace(/\.pdf$/i, ".txt");
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${item.courseCode} study resource`);
  };

  const filteredResources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resources.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.courseCode.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [resources, searchQuery, categoryFilter]);

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Shared Campus Resource Library
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Upload, tag, and download peer-vetted PDF lecture notes, past questions, and summary sheets
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant={showUploadForm ? "ghost" : "default"}
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="gap-1.5 h-9 text-xs whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            <Upload className="w-3.5 h-3.5" />
            {showUploadForm ? "Close Upload" : "Upload Resource"}
          </Button>
        </div>

        {/* Upload Resource Form */}
        {showUploadForm && (
          <form
            onSubmit={handleUploadSubmit}
            className="mt-4 p-4 rounded-xl bg-muted/40 border space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                Share PDF Lecture Notes or Past Questions
              </span>
              {courses.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Quick course:</span>
                  {courses.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCourseCode(c.course_code)}
                      className="text-xs px-2 py-0.5 rounded border bg-card hover:border-primary font-mono transition-colors"
                    >
                      {c.course_code}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="res-code" className="text-xs">
                  Course Code
                </Label>
                <Input
                  id="res-code"
                  placeholder="e.g. CSC 101"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="res-title" className="text-xs">
                  Resource Title
                </Label>
                <Input
                  id="res-title"
                  placeholder="e.g. 2024/2025 First Semester Past Questions & Marking Scheme"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Resource Type</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ["lecture_notes", "Lecture Notes"],
                      ["past_questions", "Past Questions"],
                      ["cheat_sheet", "Summary Sheet"],
                      ["lab_manual", "Lab Manual"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCategory(val)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border text-left truncate transition-colors ${
                        category === val
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="res-tags" className="text-xs">
                  Topic Tags (comma-separated)
                </Label>
                <Input
                  id="res-tags"
                  placeholder="e.g. Past Questions, Calculus, Solved"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Attach PDF / Document</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-9 text-xs justify-start gap-2 truncate"
                >
                  {selectedFile ? (
                    <>
                      <FileCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">
                        {selectedFile.name} ({selectedFile.size})
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 shrink-0" />
                      <span>Choose PDF or Doc file…</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="res-notes" className="text-xs">
                Key Excerpt / Study Notes Preview (Optional)
              </Label>
              <Input
                id="res-notes"
                placeholder="Paste key formulas, exam tips, or a brief summary for students previewing this file…"
                value={notesSummary}
                onChange={(e) => setNotesSummary(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Publish to Shared Library
              </Button>
            </div>
          </form>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t mt-3">
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg overflow-x-auto">
            {(
              [
                ["all", "All Resources"],
                ["past_questions", "Past Questions"],
                ["lecture_notes", "PDF Lecture Notes"],
                ["cheat_sheet", "Summary Sheets"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategoryFilter(key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course code, title, or #tag…"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {filteredResources.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No academic resources match your filter.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredResources.map((item) => (
              <div
                key={item.id}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  {/* Unboxed metadata line per Zero-Pill rules */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-mono font-semibold text-foreground">
                      {item.courseCode}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-primary font-medium">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.department}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{item.fileSize}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Shared by {item.uploadedBy} ({item.uploadedAt})
                    </span>
                  </div>

                  <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>

                  {/* Tag list + interactive Add Tag button */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
                    <Tag className="w-3 h-3 text-primary shrink-0" />
                    {item.tags.map((tag, i) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSearchQuery(tag)}
                        className="hover:text-primary transition-colors"
                      >
                        #{tag}
                        {i < item.tags.length - 1 ? " ·" : ""}
                      </button>
                    ))}

                    {taggingId === item.id ? (
                      <div className="inline-flex items-center gap-1 ml-1">
                        <Input
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          placeholder="Add tag…"
                          className="h-6 w-28 text-xs px-2"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTag(item.id);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => handleAddTag(item.id)}
                        >
                          Add
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTaggingId(item.id);
                          setNewTagInput("");
                        }}
                        className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline ml-1 whitespace-nowrap"
                      >
                        <Plus className="w-3 h-3" /> Tag resource
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant={item.upvotedByMe ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handleUpvote(item.id)}
                    className="h-8 px-2.5 text-xs gap-1.5 tabular-nums whitespace-nowrap shrink-0"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {item.upvotes}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewItem(item)}
                    className="h-8 px-2.5 text-xs gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleDownload(item)}
                    className="h-8 px-3 text-xs gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Resource Preview Modal */}
      <Dialog open={Boolean(previewItem)} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {previewItem?.courseCode} — {previewItem?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {previewItem && CATEGORY_LABELS[previewItem.category]} · {previewItem?.fileName} ({previewItem?.fileSize}) · Uploaded by {previewItem?.uploadedBy}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-xl bg-muted/40 border font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
            {previewItem?.previewContent}
          </div>
          <div className="flex justify-end gap-2">
            {previewItem && (
              <Button size="sm" onClick={() => handleDownload(previewItem)} className="gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Download Full Resource
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
