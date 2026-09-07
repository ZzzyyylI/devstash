import {
  isCodeItemType,
  isFileItemType,
  isMarkdownItemType,
} from "@/lib/validations/item";

/** Item type names that get a free-text Content field. */
const CONTENT_TYPE_NAMES = ["snippet", "prompt", "command", "note"];
/** Item type names that get a Language field. */
const LANGUAGE_TYPE_NAMES = ["snippet", "command"];

export interface ItemTypeFields {
  /** Show the Content field (snippet / prompt / command / note). */
  showContent: boolean;
  /** Show the Language field (snippet / command). */
  showLanguage: boolean;
  /** Show the URL field (link). */
  showUrl: boolean;
  /** Show the file/image upload (file / image). */
  showFileUpload: boolean;
  /** Content should render in the Monaco code editor. */
  showCodeEditor: boolean;
  /** Content should render in the Markdown editor. */
  showMarkdownEditor: boolean;
}

/**
 * Which type-conditional fields the "New Item" dialog and the item drawer's edit
 * form show for a given item type name (case-insensitive). Single source of
 * truth — both forms used to redeclare this branching.
 */
export function itemTypeFields(typeName: string): ItemTypeFields {
  const name = typeName.trim().toLowerCase();
  return {
    showContent: CONTENT_TYPE_NAMES.includes(name),
    showLanguage: LANGUAGE_TYPE_NAMES.includes(name),
    showUrl: name === "link",
    showFileUpload: isFileItemType(name),
    showCodeEditor: isCodeItemType(name),
    showMarkdownEditor: isMarkdownItemType(name),
  };
}
