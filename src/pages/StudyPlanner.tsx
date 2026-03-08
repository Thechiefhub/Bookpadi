import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StudyPlanner() {
  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" /> Study Planner
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered study planning tools</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover:shadow-elevated transition-all cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-2">
                <Calendar className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle>Generate Timetable</CardTitle>
              <CardDescription>
                Create a weekly study schedule based on your courses and preferred study hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="gradient-primary hover:opacity-90 w-full">
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elevated transition-all cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center mb-2">
                <FileText className="w-6 h-6 text-secondary-foreground" />
              </div>
              <CardTitle>Generate Study Guide</CardTitle>
              <CardDescription>
                Get an AI-generated study guide for any of your courses based on the curriculum
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full">
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
