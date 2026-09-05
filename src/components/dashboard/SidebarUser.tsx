"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";

export interface SidebarUserData {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface SidebarUserProps {
  user: SidebarUserData;
  collapsed: boolean;
  /** Called when a menu link is followed (used to close the mobile drawer). */
  onNavigate?: () => void;
}

/**
 * Bottom-of-sidebar account control. The avatar links to `/profile`; the
 * chevron opens an upward menu with a sign-out action.
 */
export function SidebarUser({ user, collapsed, onNavigate }: SidebarUserProps) {
  const router = useRouter();
  const name = user.name?.trim() || "Account";

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="shrink-0 border-t border-border p-3">
      <div
        className={cn(
          "flex items-center gap-2.5",
          collapsed && "justify-center",
        )}
      >
        <Link
          href="/profile"
          onClick={onNavigate}
          aria-label="View profile"
          title={collapsed ? name : undefined}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <UserAvatar name={user.name} image={user.image} />
        </Link>

        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              {user.email && (
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              )}
            </div>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                aria-label="Account menu"
                className="rounded-md p-1.5 text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronsUpDown className="size-4" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  side="top"
                  align="end"
                  sideOffset={6}
                  className="z-50 min-w-44 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in"
                >
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/profile"
                      onClick={onNavigate}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                    >
                      <UserRound className="size-4" />
                      Profile
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item
                    onSelect={(event) => {
                      event.preventDefault();
                      void handleSignOut();
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </>
        )}
      </div>
    </div>
  );
}
