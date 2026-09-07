import Link from "next/link";
import { redirect } from "next/navigation";
import { Folder } from "lucide-react";

import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { HomeNav } from "@/components/home/HomeNav";

export const metadata = {
  title: "Create account · DevStash",
};

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <>
      <HomeNav signedIn={false} />
      <main className="flex min-h-screen items-center justify-center p-6 pt-24">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <Link
              href="/"
              className="flex items-center gap-2 font-extrabold tracking-tight"
            >
              <Folder className="size-5 text-[#3b82f6]" />
              <span>DevStash</span>
            </Link>
            <h1 className="text-xl font-semibold">Create your account</h1>
            <p className="text-sm text-muted-foreground">
              Start stashing your developer knowledge
            </p>
          </div>

          <RegisterForm />
        </div>
      </main>
    </>
  );
}
