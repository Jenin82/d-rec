import { Suspense } from "react";
import { GoogleAuthForm } from "@/components/google-auth-form";

export default function SignupPage() {
  return <Suspense><GoogleAuthForm mode="signup" /></Suspense>;
}
