import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers } from "lucide-react";

import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create account · DevStash",
};

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <Layers className="size-5" />
          </Link>
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Start stashing your developer knowledge
          </p>
        </div>

        <RegisterForm />
      </div>
    </main>
  );
}
