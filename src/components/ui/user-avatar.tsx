import { Avatar } from "radix-ui";

import { cn } from "@/lib/utils";

/** "Brad Traversy" → "BT"; falls back to "?" when there's no usable name. */
export function initials(name?: string | null) {
  const letters = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return letters || "?";
}

interface UserAvatarProps {
  name?: string | null;
  /** Profile image URL (e.g. from GitHub). Falls back to initials when absent. */
  image?: string | null;
  className?: string;
}

/**
 * Circular user avatar. Renders the image when one is available, otherwise the
 * user's initials on a muted background. Radix `Avatar` handles the swap so a
 * broken/slow image still shows the fallback.
 */
export function UserAvatar({ name, image, className }: UserAvatarProps) {
  return (
    <Avatar.Root
      className={cn(
        "inline-flex size-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {image && (
        <Avatar.Image
          src={image}
          alt={name ?? "User avatar"}
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      )}
      <Avatar.Fallback className="flex size-full items-center justify-center">
        {initials(name)}
      </Avatar.Fallback>
    </Avatar.Root>
  );
}
