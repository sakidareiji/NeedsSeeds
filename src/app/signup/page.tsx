import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getAuthUser } from "@/lib/auth";

export const metadata: Metadata = { title: "新規登録" };

export default async function SignupPage() {
  if (await getAuthUser()) redirect("/");
  return <AuthForm mode="signup" />;
}
