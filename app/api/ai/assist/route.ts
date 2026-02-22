import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { code, algorithm, description, language, mode } = await req.json();

    let prompt = "";
    if (mode === "algorithm") {
      prompt = `You are a strict but helpful computer science teaching assistant. Review the following student's algorithm for solving the problem. 
      Do NOT write code for them. Provide constructive feedback, highlighting missing edge cases, time/space complexity issues, or logical flaws. 
      If the algorithm is perfect, explicitly state "APPROVED" at the very beginning of your response.
      Keep it short, clear and concise.
      
      Problem Description:
      ${description}
      
      Student's Algorithm:
      ${algorithm}`;
    } else {
      prompt = `You are a strict but helpful computer science teaching assistant. Review the following student's code. 
      Do NOT write the complete solution for them. Provide small hints, point out syntax or logical errors, and suggest improvements for time/space complexity.
      Keep it short, clear and concise.
      
      Problem Description:
      ${description}
      
      Language: ${language}
      
      Student's Code:
      ${code}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json({ feedback: response.text });
  } catch (error) {
    console.error("AI Assist Error:", error);
    return NextResponse.json(
      { error: "Internal server error during AI generation" },
      { status: 500 },
    );
  }
}
