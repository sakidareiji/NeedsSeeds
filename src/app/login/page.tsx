import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getAuthUser } from "@/lib/auth";

export const metadata: Metadata = { title: "ログイン" };

export default async function LoginPage() {
  if (await getAuthUser()) redirect("/");
  return <AuthForm mode="login" />;
}
