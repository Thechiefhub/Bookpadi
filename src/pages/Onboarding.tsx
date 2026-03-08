import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, GraduationCap, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { nigerianUniversities } from "@/data/nigerianUniversities";

interface Department {
  id: string;
  name: string;
  faculty: string;
}

export default function Onboarding() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [institutionOpen, setInstitutionOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("departments").select("*").order("name").then(({ data }) => {
      if (data) setDepartments(data);
    });
  }, []);

  const federalUnis = useMemo(() => nigerianUniversities.filter(u => u.type === "federal"), []);
  const stateUnis = useMemo(() => nigerianUniversities.filter(u => u.type === "state"), []);
  const privateUnis = useMemo(() => nigerianUniversities.filter(u => u.type === "private"), []);

  const handleSubmit = async () => {
    if (!selectedDept || !selectedLevel) {
      toast.error("Please select your department and level");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        department_id: selectedDept,
        institution: selectedInstitution || null,
        level: parseInt(selectedLevel),
      } as any)
      .eq("user_id", user!.id);
    setLoading(false);
    if (error) {
      toast.error("Failed to save. Please try again.");
    } else {
      await refreshProfile();
      navigate("/dashboard");
    }
  };

  const faculties = [...new Set(departments.map(d => d.faculty))].sort();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full gradient-primary opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full gradient-secondary opacity-10 blur-3xl" />
      </div>
      <Card className="w-full max-w-lg shadow-elevated relative">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-xl gradient-secondary flex items-center justify-center mb-2">
            <GraduationCap className="w-7 h-7 text-secondary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Set up your profile</CardTitle>
          <CardDescription>Tell us about your programme so we can show you the right courses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Department / Programme</Label>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger>
                <SelectValue placeholder="Select your department" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {faculties.map((faculty) => {
                  const depts = departments.filter(d => d.faculty === faculty);
                  return depts.length > 0 ? (
                    <div key={faculty}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{faculty}</div>
                      {depts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </div>
                  ) : null;
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Institution */}
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
                <SelectValue placeholder="Select your level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100 Level</SelectItem>
                <SelectItem value="200">200 Level</SelectItem>
                <SelectItem value="300">300 Level</SelectItem>
                <SelectItem value="400">400 Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} className="w-full gradient-primary hover:opacity-90" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue to Dashboard"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}