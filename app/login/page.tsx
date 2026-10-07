import { Suspense } from "react";
import { GoogleAuthForm } from "@/components/google-auth-form";

export default function LoginPage() {
  return <Suspense><GoogleAuthForm mode="login" /></Suspense>;
}
