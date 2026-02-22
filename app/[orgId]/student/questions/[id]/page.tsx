"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Code2, FileText, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";

export default function QuestionDetailPage({
  params,
}: {
  params: { orgId: string };
}) {
  const { orgId } = params;
  // In a real app, you would fetch the question and submission status based on params.id
  const [questionStatus] = useState({
    algorithm: "approved", // "pending_submission", "pending_review", "approved", "rejected"
    code: "pending_submission", // "pending_submission", "pending_review", "approved", "rejected"
  });

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="h-8 w-8">
          <Link href={`/${orgId}/student/questions`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Implement Binary Search
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">Data Structures</Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Due in 3 days
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Problem Description</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none text-sm">
              <p>
                Write a function that implements the binary search algorithm to
                find the index of a target value in a sorted array of integers.
              </p>
              <h3>Requirements:</h3>
              <ul>
                <li>The array is sorted in ascending order.</li>
                <li>If the target exists, return its index.</li>
                <li>If the target does not exist, return -1.</li>
                <li>
                  Your algorithm must have <code>O(log n)</code> time
                  complexity.
                </li>
              </ul>
              <h3>Example 1:</h3>
              <pre>
                <code>
                  Input: nums = [-1,0,3,5,9,12], target = 9 Output: 4
                  Explanation: 9 exists in nums and its index is 4
                </code>
              </pre>
              <h3>Constraints:</h3>
              <ul>
                <li>
                  <code>1 &lt;= nums.length &lt;= 10^4</code>
                </li>
                <li>
                  <code>-10^4 &lt; nums[i], target &lt; 10^4</code>
                </li>
                <li>
                  All values in <code>nums</code> are unique.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
              <CardDescription>Complete the steps in order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Algorithm */}
              <div className="relative pl-6 pb-6 border-l-2 border-primary/20 last:pb-0 last:border-transparent">
                <div
                  className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-background ${
                    questionStatus.algorithm === "approved"
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-primary"
                  }`}
                >
                  {questionStatus.algorithm === "approved" && (
                    <CheckCircle2 className="h-full w-full text-white" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">1. Algorithm</h4>
                    <StatusBadge status={questionStatus.algorithm} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Write and submit your logic for approval.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    variant={
                      questionStatus.algorithm === "approved"
                        ? "outline"
                        : "default"
                    }
                    className="w-full mt-2 gap-2"
                  >
                    <Link href={`/${orgId}/student/questions/1/algorithm`}>
                      <FileText className="h-4 w-4" />
                      {questionStatus.algorithm === "approved"
                        ? "View Algorithm"
                        : "Write Algorithm"}
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Step 2: Code */}
              <div className="relative pl-6 border-l-2 border-transparent">
                <div
                  className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-background ${
                    questionStatus.code === "approved"
                      ? "border-emerald-500 bg-emerald-500"
                      : questionStatus.algorithm === "approved"
                        ? "border-primary"
                        : "border-muted"
                  }`}
                >
                  {questionStatus.code === "approved" && (
                    <CheckCircle2 className="h-full w-full text-white" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`font-semibold text-sm ${questionStatus.algorithm !== "approved" ? "text-muted-foreground" : ""}`}
                    >
                      2. Code Implementation
                    </h4>
                    {questionStatus.algorithm === "approved" && (
                      <StatusBadge status={questionStatus.code} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Write, test, and submit your code.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    variant={
                      questionStatus.code === "approved" ? "outline" : "default"
                    }
                    disabled={questionStatus.algorithm !== "approved"}
                    className="w-full mt-2 gap-2"
                  >
                    <Link href={`/${orgId}/student/questions/1/code`}>
                      <Code2 className="h-4 w-4" />
                      {questionStatus.code === "approved"
                        ? "View Code"
                        : "Open Editor"}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
