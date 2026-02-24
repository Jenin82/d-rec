"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Save, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuestionStore } from "@/stores/question-store";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";

export default function CreateQuestionPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>(
    [],
  );

  const searchParams = useSearchParams();
  const preselectedClassroomId = searchParams.get("classroom");
  const { createProgram } = useQuestionStore();

  useEffect(() => {
    if (orgId) {
      loadClassrooms();
    }
  }, [orgId]);

  useEffect(() => {
    if (preselectedClassroomId && classrooms.length > 0 && !selectedClassroom) {
      if (classrooms.some((c) => c.id === preselectedClassroomId)) {
        setSelectedClassroom(preselectedClassroomId);
      }
    }
  }, [preselectedClassroomId, classrooms, selectedClassroom]);

  async function loadClassrooms() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user?.id) return;

    const { data: memberData } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", userData.user.id)
      .single();

    if (
      memberData &&
      (memberData.role === "admin" || memberData.role === "owner")
    ) {
      const { data } = await supabase
        .from("classrooms")
        .select("id, name")
        .eq("organization_id", orgId);
      if (data) setClassrooms(data);
    } else {
      const { data } = await supabase
        .from("classrooms")
        .select("id, name, classroom_members!inner(user_id)")
        .eq("organization_id", orgId)
        .eq("classroom_members.user_id", userData.user.id);
      if (data) setClassrooms(data);
    }
  }

  const handleCreateQuestion = async () => {
    if (!title || !description || !selectedClassroom) return;
    setIsSubmitting(true);

    await createProgram({
      title,
      description,
      classroom_id: selectedClassroom,
      status: "published",
      metadata: {},
    });

    setIsSubmitting(false);
    router.push(`/${orgId}/teacher/classrooms/${selectedClassroom}`);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full p-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="h-8 w-8">
          <Link href={`/${orgId}/teacher/questions`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Create Assignment
          </h2>
          <p className="text-muted-foreground">
            Post a new programming question for your class.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Details</CardTitle>
          <CardDescription>
            Provide the problem statement and select which classroom should
            receive it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="classroom">Target Classroom</Label>
            <Select
              value={selectedClassroom}
              onValueChange={setSelectedClassroom}
              disabled={classrooms.length === 0}
            >
              <SelectTrigger id="classroom" className="w-full md:w-[300px]">
                <SelectValue
                  placeholder={
                    classrooms.length === 0
                      ? "No classrooms available"
                      : "Select a classroom"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {classrooms.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Problem Title</Label>
            <Input
              id="title"
              placeholder="e.g. Implement Binary Search"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="max-w-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Problem Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the problem, input/output format, and constraints..."
              className="min-h-[300px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Markdown is supported for formatting the description.
            </p>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <Button variant="ghost" asChild disabled={isSubmitting}>
              <Link href={`/${orgId}/teacher/questions`}>Cancel</Link>
            </Button>
            <Button
              onClick={handleCreateQuestion}
              disabled={
                isSubmitting || !title || !description || !selectedClassroom
              }
              className="gap-2 min-w-[140px]"
            >
              {isSubmitting ? (
                "Posting..."
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Post Assignment
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
