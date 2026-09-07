import { cn } from "@/lib/utils";
import { itemTypeFields } from "@/lib/item-type-fields";
import { CodeEditor } from "@/components/items/CodeEditor";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { Field } from "@/components/items/item-form/Field";
import { textareaClass } from "@/components/items/item-form/field-styles";

/**
 * The "Content" field for the item forms. Picks the editor by item type —
 * `CodeEditor` for snippet / command, `MarkdownEditor` for prompt / note, a
 * plain monospace `<textarea>` otherwise — inside the shared {@link Field}
 * wrapper. Callers gate rendering on `itemTypeFields(type).showContent`.
 */
export function ItemContentField({
  typeName,
  value,
  onChange,
  language,
  error,
}: {
  typeName: string;
  value: string;
  onChange: (next: string) => void;
  language?: string;
  error?: string[];
}) {
  const { showCodeEditor, showMarkdownEditor } = itemTypeFields(typeName);

  return (
    <Field label="Content" error={error}>
      {showCodeEditor ? (
        <CodeEditor value={value} onChange={onChange} language={language} />
      ) : showMarkdownEditor ? (
        <MarkdownEditor value={value} onChange={onChange} />
      ) : (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={8}
          className={cn(textareaClass, "font-mono text-xs leading-relaxed")}
        />
      )}
    </Field>
  );
}
