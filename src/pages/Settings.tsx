import { useState, useEffect, useMemo } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, User, Moon, Sun, ChevronsUpDown, Check, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { nigerianUniversities } from "@/data/nigerianUniversities";

interface Department {
  id: string;
  name: string;
  faculty: string;
}

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fullName, setFullName] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [institutionOpen, setInstitutionOpen] = useState(false);

  useEffect(() => {
    supabase.from("departments").select("*").order("name").then(({ data }) => {
      if (data) setDepartments(data);
    });
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setSelectedDept(profile.department_id || "");
      setSelectedInstitution(profile.institution || "");
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
        institution: selectedInstitution || null,
        level: parseInt(selectedLevel),
      } as any)
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

  const federalUnis = useMemo(() => nigerianUniversities.filter(u => u.type === "federal"), []);
  const stateUnis = useMemo(() => nigerianUniversities.filter(u => u.type === "state"), []);
  const privateUnis = useMemo(() => nigerianUniversities.filter(u => u.type === "private"), []);

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
                <CardDescription>Update your name, institution, department and level</CardDescription>
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

            {/* Institution (searchable combobox) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" /> Institution
              </Label>
              <Popover open={institutionOpen} onOpenChange={setInstitutionOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={institutionOpen}
                    className="w-full justify-between font-normal h-10"
                  >
                    <span className="truncate">
                      {selectedInstitution || "Select your university…"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search university…" />
                    <CommandList className="max-h-60">
                      <CommandEmpty>No university found.</CommandEmpty>
                      <CommandGroup heading="Federal Universities">
                        {federalUnis.map((uni) => (
                          <CommandItem
                            key={uni.name}
                            value={uni.name}
                            onSelect={(val) => {
                              setSelectedInstitution(val === selectedInstitution ? "" : val);
                              setInstitutionOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedInstitution === uni.name ? "opacity-100" : "opacity-0")} />
                            {uni.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup heading="State Universities">
                        {stateUnis.map((uni) => (
                          <CommandItem
                            key={uni.name}
                            value={uni.name}
                            onSelect={(val) => {
                              setSelectedInstitution(val === selectedInstitution ? "" : val);
                              setInstitutionOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedInstitution === uni.name ? "opacity-100" : "opacity-0")} />
                            {uni.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup heading="Private Universities">
                        {privateUnis.map((uni) => (
                          <CommandItem
                            key={uni.name}
                            value={uni.name}
                            onSelect={(val) => {
                              setSelectedInstitution(val === selectedInstitution ? "" : val);
                              setInstitutionOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedInstitution === uni.name ? "opacity-100" : "opacity-0")} />
                            {uni.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <CardTitle className="text-lg">Appearance</CardTitle>
                <CardDescription>Toggle between light and dark mode</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Switch to dark theme</p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">{user?.email}</p>
      </div>
    </AppLayout>
  );
}
