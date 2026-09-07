import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_EDITOR_PREFERENCES,
  normalizeEditorPreferences,
  type EditorPreferences,
} from "@/lib/editor-preferences";

/**
 * Read/write the current session user's Monaco editor preferences. Unlike the
 * dashboard data layer (demo-user scoped), these are keyed by the real signed-in
 * user id — the caller resolves it from `auth()`.
 */

export async function getEditorPreferences(
  userId: string | null | undefined,
): Promise<EditorPreferences> {
  if (!userId) return DEFAULT_EDITOR_PREFERENCES;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { editorPreferences: true },
  });
  return normalizeEditorPreferences(user?.editorPreferences ?? null);
}

export async function updateEditorPreferences(
  userId: string,
  data: EditorPreferences,
): Promise<EditorPreferences> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { editorPreferences: data as unknown as Prisma.InputJsonObject },
    select: { editorPreferences: true },
  });
  return normalizeEditorPreferences(user.editorPreferences);
}
