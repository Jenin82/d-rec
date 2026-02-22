import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { source_code, language_id, stdin } = body;

    const JUDGE0_URL =
      process.env.NEXT_PUBLIC_JUDGE0_URL || "https://judge0-ce.p.rapidapi.com";
    const JUDGE0_HOST = process.env.JUDGE0_HOST || "judge0-ce.p.rapidapi.com";
    const JUDGE0_KEY = process.env.JUDGE0_KEY;

    if (!JUDGE0_KEY) {
      console.warn(
        "Judge0 API key not configured. Code execution will fail in production.",
      );
    }

    // Convert strings to base64 for Judge0
    const encodedSourceCode = Buffer.from(source_code).toString("base64");
    const encodedStdin = stdin ? Buffer.from(stdin).toString("base64") : "";

    // Step 1: Submit code to Judge0
    const submissionResponse = await fetch(
      `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true&fields=*`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Host": JUDGE0_HOST,
          "X-RapidAPI-Key": JUDGE0_KEY || "",
        },
        body: JSON.stringify({
          source_code: encodedSourceCode,
          language_id,
          stdin: encodedStdin,
        }),
      },
    );

    if (!submissionResponse.ok) {
      const errorText = await submissionResponse.text();
      return NextResponse.json(
        { error: "Failed to submit code to Judge0", details: errorText },
        { status: submissionResponse.status },
      );
    }

    const data = await submissionResponse.json();

    // Decode base64 responses if present
    const decodedData = {
      ...data,
      stdout: data.stdout
        ? Buffer.from(data.stdout, "base64").toString("utf-8")
        : null,
      stderr: data.stderr
        ? Buffer.from(data.stderr, "base64").toString("utf-8")
        : null,
      compile_output: data.compile_output
        ? Buffer.from(data.compile_output, "base64").toString("utf-8")
        : null,
      message: data.message
        ? Buffer.from(data.message, "base64").toString("utf-8")
        : null,
    };

    return NextResponse.json(decodedData);
  } catch (error) {
    console.error("Code execution error:", error);
    return NextResponse.json(
      { error: "Internal server error during code execution" },
      { status: 500 },
    );
  }
}
