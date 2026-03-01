import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is missing. Add it to .env/.env.local and restart the dev server.",
        },
        { status: 500 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const { code, algorithm, description, question, language, mode } =
      await req.json();

    const promptDescription = (question || description || "").trim();

    if (!promptDescription) {
      return NextResponse.json(
        { error: "Question/description is required for AI evaluation." },
        { status: 400 },
      );
    }

    let prompt = "";
    if (mode === "algorithm") {
      if (!algorithm?.trim()) {
        return NextResponse.json(
          { error: "Algorithm content is required for algorithm review." },
          { status: 400 },
        );
      }

      prompt = `You are a strict but helpful computer science teaching assistant. Review the following student's algorithm for solving the problem. 
      Do NOT write code for them. Provide constructive feedback, highlighting missing edge cases, time/space complexity issues, or logical flaws. 
      If the algorithm is perfect, explicitly state "APPROVED" at the very beginning of your response.
      Keep it short, clear and concise.
      
      Problem Description:
      ${promptDescription}
      
      Student's Algorithm:
      ${algorithm}`;
    } else {
      if (!code?.trim()) {
        return NextResponse.json(
          { error: "Code content is required for code review." },
          { status: 400 },
        );
      }

      prompt = `You are a strict but helpful computer science teaching assistant. Review the following student's code. 
      Do NOT write the complete solution for them. Provide small hints, point out syntax or logical errors, and suggest improvements for time/space complexity.
      Keep it short, clear and concise.
      
      Problem Description:
      ${promptDescription}
      
      Language: ${language}
      
      Student's Code:
      ${code}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json({
      feedback:
        response.text ||
        "No feedback generated. Please try refining your input.",
    });
  } catch (error) {
    console.error("AI Assist Error:", error);
    return NextResponse.json(
      { error: "Internal server error during AI generation" },
      { status: 500 },
    );
  }
}
