import { useState } from "react";
import { toast } from "sonner";

import { updateItem } from "@/actions/items";
import { itemTypeFields } from "@/lib/item-type-fields";
import { parseTagsInput } from "@/lib/tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ItemDetailJson } from "@/components/items/item-detail-json";
import { Field } from "@/components/items/item-form/Field";
import { textareaClass } from "@/components/items/item-form/field-styles";
import { ItemContentField } from "@/components/items/item-form/ItemContentField";
import { LanguageSelect } from "@/components/items/item-form/LanguageSelect";
import { CollectionPicker } from "@/components/items/item-form/CollectionPicker";
import { SuggestTagsButton } from "@/components/items/item-form/SuggestTagsButton";

/**
 * Inline edit form for the item drawer — replaces the action bar (with
 * Save / Cancel) and the detail body (with editable fields). Type-specific
 * fields (Content / Language / URL) show only for the relevant item type. The
 * server action re-validates everything; the only client-side guard is
 * disabling Save on an empty title.
 */
export function ItemEditForm({
  detail,
  isPro,
  onCancel,
  onSaved,
}: {
  detail: ItemDetailJson;
  /** Gates the Pro-only "Suggest tags" control. */
  isPro: boolean;
  onCancel: () => void;
  onSaved: (updated: ItemDetailJson) => void;
}) {
  const { showContent, showLanguage, showUrl } = itemTypeFields(
    detail.type.name,
  );

  const [title, setTitle] = useState(detail.title);
  const [description, setDescription] = useState(detail.description ?? "");
  const [tagsInput, setTagsInput] = useState(detail.tags.join(", "));
  const [content, setContent] = useState(detail.content ?? "");
  const [language, setLanguage] = useState(detail.language ?? "");
  const [url, setUrl] = useState(detail.url ?? "");
  const [collectionIds, setCollectionIds] = useState(
    detail.collections.map((collection) => collection.id),
  );
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const titleEmpty = title.trim().length === 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || titleEmpty) return;

    setPending(true);
    setFieldErrors({});

    const result = await updateItem(detail.id, {
      title,
      description,
      tags: parseTagsInput(tagsInput),
      content: showContent ? content : null,
      language: showLanguage ? language : null,
      url: showUrl ? url : null,
      collectionIds,
    });

    setPending(false);

    if (!result.success) {
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      toast.error(result.error);
      return;
    }

    const data = result.data;
    toast.success("Item updated");
    onSaved({
      ...data,
      createdAt: new Date(data.createdAt).toISOString(),
      updatedAt: new Date(data.updatedAt).toISOString(),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col overflow-hidden"
    >
      <div className="flex items-center gap-2 border-b border-border px-6 py-3">
        <Button type="submit" size="sm" disabled={pending || titleEmpty}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
        <Field label="Title" error={fieldErrors.title}>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={titleEmpty || Boolean(fieldErrors.title)}
            autoFocus
          />
        </Field>

        <Field label="Description" error={fieldErrors.description}>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className={textareaClass}
          />
        </Field>

        {showLanguage && (
          <Field label="Language" error={fieldErrors.language}>
            <LanguageSelect value={language} onChange={setLanguage} />
          </Field>
        )}

        {showContent && (
          <ItemContentField
            typeName={detail.type.name}
            value={content}
            onChange={setContent}
            language={language}
            error={fieldErrors.content}
          />
        )}

        {showUrl && (
          <Field label="URL" error={fieldErrors.url}>
            <Input
              type="text"
              inputMode="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
              aria-invalid={Boolean(fieldErrors.url)}
            />
          </Field>
        )}

        <Field label="Tags" hint="Comma-separated" error={fieldErrors.tags}>
          <Input
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder="react, hooks, patterns"
          />
          <SuggestTagsButton
            isPro={isPro}
            title={title}
            content={showContent ? content : null}
            existingTags={parseTagsInput(tagsInput)}
            onAccept={(tag) =>
              setTagsInput((prev) =>
                prev.trim()
                  ? `${prev.replace(/,\s*$/, "")}, ${tag}`
                  : tag,
              )
            }
          />
        </Field>

        <CollectionPicker
          selected={collectionIds}
          onChange={setCollectionIds}
          disabled={pending}
          error={fieldErrors.collectionIds}
        />
      </div>
    </form>
  );
}
