import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, User, Moon, Sun } from "lucide-react";

interface Department {
  id: string;
  name: string;
  faculty: string;
}

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fullName, setFullName] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("departments").select("*").order("name").then(({ data }) => {
      if (data) setDepartments(data);
    });
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setSelectedDept(profile.department_id || "");
      setSelectedLevel(profile.level?.toString() || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    if (!selectedDept || !selectedLevel) {
      toast.error("Please select department and level");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        department_id: selectedDept,
        level: parseInt(selectedLevel),
      })
      .eq("user_id", user!.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save changes");
    } else {
      await refreshProfile();
      toast.success("Profile updated successfully");
    }
  };

  const scienceDepts = departments.filter(d => d.faculty === "Sciences");
  const educationDepts = departments.filter(d => d.faculty === "Education");

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your profile</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Profile</CardTitle>
                <CardDescription>Update your name, department and level</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
            </div>

            <div className="space-y-2">
              <Label>Department / Programme</Label>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {scienceDepts.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Sciences</div>
                      {scienceDepts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </>
                  )}
                  {educationDepts.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Education</div>
                      {educationDepts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100 Level</SelectItem>
                  <SelectItem value="200">200 Level</SelectItem>
                  <SelectItem value="300">300 Level</SelectItem>
                  <SelectItem value="400">400 Level</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">{user?.email}</p>
      </div>
    </AppLayout>
  );
}
