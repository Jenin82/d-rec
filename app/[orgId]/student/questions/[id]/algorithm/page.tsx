"use client";

import { useState, useEffect } from "react";
import { Save, CheckCircle2, Bot, Info, ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";

export default function StudentAlgorithmPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.id as string;
  const user = useAuthStore((s) => s.user);

  const [algorithm, setAlgorithm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && programId) {
      loadSubmission();
    }
  }, [user, programId]);

  async function loadSubmission() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("algorithm_submissions")
      .select("content, status")
      .eq("program_id", programId)
      .eq("student_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setAlgorithm(data.content);
      setStatus(data.status);
    }
    setIsLoading(false);
  }

  const handleSaveDraft = async () => {
    if (!algorithm.trim() || !user) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from("algorithm_submissions")
      .upsert({
        program_id: programId,
        student_id: user.id,
        content: algorithm,
        status: "draft"
      }, { onConflict: "program_id, student_id" });

    if (!error) {
      setStatus("draft");
    }
    setIsSaving(false);
  };

  const handleSubmit = async () => {
    if (!algorithm.trim() || !user) return;
    setIsSubmitting(true);
    
    // In a real app, this would change status to pending_review for teacher
    // For demo purposes, we'll automatically approve it or set to pending
    const newStatus = "approved"; // Auto-approve for demo
    
    const { error } = await supabase
      .from("algorithm_submissions")
      .upsert({
        program_id: programId,
        student_id: user.id,
        content: algorithm,
        status: newStatus
      }, { onConflict: "program_id, student_id" });

    if (!error) {
      setStatus(newStatus);
      // Auto-redirect to code step if approved
      if (newStatus === "approved") {
        setTimeout(() => {
          router.push(`/student/questions/${programId}/code`);
        }, 1500);
      }
    }
    setIsSubmitting(false);
  };

  const handleGetAiHelp = async () => {
    if (!algorithm.trim()) {
      setAiSuggestion("Please write some algorithm steps first before asking for suggestions.");
      return;
    }

    setIsAiLoading(true);
    // In a real app, this would call your Claude API route
    // Here we simulate an AI review response
    setTimeout(() => {
      setAiSuggestion(
        "Your algorithm looks like a good start! Here are a few suggestions to improve it:\n\n" +
        "1. **Initialize variables**: You mentioned 'count' but didn't state its initial value. It's best practice to specify `count = 0`.\n" +
        "2. **Loop Condition**: Step 3 says 'Loop until end of array', try to be more precise like 'While index i < length of array'.\n" +
        "3. **Edge Cases**: Consider adding a step at the beginning to check if the input array is empty.\n\n" +
        "Keep going, you're on the right track!"
      );
      setIsAiLoading(false);
    }, 1500);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div></div>;
  }

  const isApproved = status === "approved";
  const isPending = status === "pending_review";
  const isReadOnly = isApproved || isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-8 w-8 shrink-0">
            <Link href={`/student/questions/${programId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Algorithm</h2>
            <p className="text-muted-foreground">
              {isApproved ? "Your algorithm was approved!" : isPending ? "Waiting for teacher review." : "Write your algorithm steps for teacher approval."}
            </p>
          </div>
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSaveDraft} disabled={isSaving || isSubmitting || !algorithm.trim()}>
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
            <Button size="sm" className="gap-2" onClick={handleSubmit} disabled={isSubmitting || isSaving || !algorithm.trim()}>
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          </div>
        )}
        {isApproved && (
          <Button size="sm" className="gap-2" asChild>
            <Link href={`/student/questions/${programId}/code`}>
              Proceed to Code Step <ArrowLeft className="h-4 w-4 rotate-180" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_350px]">
        <div className="flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Algorithm Steps</CardTitle>
              <CardDescription>
                Write clear, step-by-step instructions. You can use markdown for formatting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Step 1: Start...&#10;Step 2: Initialize variables...&#10;Step 3: Loop..."
                className="min-h-[500px] resize-y font-mono"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                disabled={isReadOnly}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-5 w-5 text-primary" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground flex gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Stuck or want to improve your logic? The AI can review your current steps and offer hints (it won't write the answer for you).
                </p>
              </div>
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={handleGetAiHelp}
                disabled={isAiLoading || isReadOnly || !algorithm.trim()}
              >
                {isAiLoading ? "Analyzing..." : "Review My Algorithm"}
              </Button>

              {aiSuggestion && (
                <div className="mt-4 rounded-lg border bg-card p-4 text-sm">
                  <h4 className="font-semibold mb-2">AI Feedback:</h4>
                  <div className="whitespace-pre-wrap text-muted-foreground">
                    {aiSuggestion}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
