import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EditorPreferencesProvider } from "@/components/editor-preferences/EditorPreferencesProvider";
import { getItemTypesWithCounts } from "@/lib/db/item-types";
import { getSidebarCollections } from "@/lib/db/collections";
import { getEditorPreferences } from "@/lib/db/editor-preferences";
import { getSearchIndex } from "@/lib/db/search";

// The sidebar reads live data from Neon — don't statically cache it at build time.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const [itemTypes, collections, searchIndex, editorPreferences] =
    await Promise.all([
      getItemTypesWithCounts(),
      getSidebarCollections(),
      getSearchIndex(),
      getEditorPreferences(session?.user?.id),
    ]);

  const user = {
    name: session?.user?.name,
    email: session?.user?.email,
    image: session?.user?.image,
  };

  return (
    <EditorPreferencesProvider initial={editorPreferences}>
      <DashboardShell
        itemTypes={itemTypes}
        collections={collections}
        user={user}
        searchIndex={searchIndex}
        isPro={Boolean(session?.user?.isPro)}
      >
        {children}
      </DashboardShell>
    </EditorPreferencesProvider>
  );
}
