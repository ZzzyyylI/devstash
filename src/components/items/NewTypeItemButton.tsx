"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import type { CreateItemType } from "@/lib/validations/item";
import { Button } from "@/components/ui/button";
import { NewItemDialog } from "@/components/items/NewItemDialog";

/**
 * "New <type>" button for a type page (e.g. /items/snippet). Opens the shared
 * create-item dialog with the page's type pre-selected.
 */
export function NewTypeItemButton({ type }: { type: CreateItemType }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" className="capitalize" onClick={() => setOpen(true)}>
        <Plus />
        New {type}
      </Button>
      <NewItemDialog open={open} onOpenChange={setOpen} initialType={type} />
    </>
  );
}
