"use server";

import { signIn } from "@/auth";

/**
 * Start the GitHub OAuth sign-in from the server.
 *
 * Running the OAuth handoff inside a Server Action (instead of the client
 * `signIn` from `next-auth/react`) lets Auth.js issue a real HTTP redirect to
 * GitHub, which fixes the OAuth redirect getting swallowed on the client.
 *
 * `signIn` redirects by throwing, so this never returns on success.
 */
export async function signInWithGitHub(redirectTo: string) {
  await signIn("github", { redirectTo });
}
