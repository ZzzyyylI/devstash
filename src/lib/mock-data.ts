export interface MockUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isPro: boolean;
}

export interface MockItemType {
  id: string;
  name: string;
  /** lucide-react icon name */
  icon: string;
  /** tailwind-friendly hex used for color coding */
  color: string;
  isSystem: boolean;
  itemCount: number;
}

export interface MockCollection {
  id: string;
  name: string;
  description: string;
  isFavorite: boolean;
  itemCount: number;
  /** accent color shown on the collection card border */
  color: string;
}

export interface MockItem {
  id: string;
  title: string;
  description: string;
  contentType: "text" | "file";
  content: string | null;
  language: string | null;
  url: string | null;
  fileName: string | null;
  fileSize: number | null;
  isFavorite: boolean;
  isPinned: boolean;
  typeId: string;
  collectionId: string | null;
  tags: string[];
  updatedAt: string;
}

export const mockUser: MockUser = {
  id: "user_1",
  name: "John Doe",
  email: "john@example.com",
  avatarUrl: null,
  isPro: true,
};

export const mockItemTypes: MockItemType[] = [
  { id: "type_snippet", name: "Snippets", icon: "Code2", color: "#3b82f6", isSystem: true, itemCount: 24 },
  { id: "type_prompt", name: "Prompts", icon: "Sparkles", color: "#a855f7", isSystem: true, itemCount: 18 },
  { id: "type_command", name: "Commands", icon: "SquareChevronRight", color: "#f97316", isSystem: true, itemCount: 15 },
  { id: "type_note", name: "Notes", icon: "FileText", color: "#eab308", isSystem: true, itemCount: 12 },
  { id: "type_file", name: "Files", icon: "File", color: "#94a3b8", isSystem: true, itemCount: 5 },
  { id: "type_image", name: "Images", icon: "Image", color: "#ec4899", isSystem: true, itemCount: 3 },
  { id: "type_link", name: "Links", icon: "Link", color: "#14b8a6", isSystem: true, itemCount: 8 },
];

export const mockCollections: MockCollection[] = [
  {
    id: "col_react_patterns",
    name: "React Patterns",
    description: "Common React patterns and hooks",
    isFavorite: true,
    itemCount: 12,
    color: "#3b82f6",
  },
  {
    id: "col_python_snippets",
    name: "Python Snippets",
    description: "Useful Python code snippets",
    isFavorite: false,
    itemCount: 8,
    color: "#3b82f6",
  },
  {
    id: "col_context_files",
    name: "Context Files",
    description: "AI context files for projects",
    isFavorite: true,
    itemCount: 5,
    color: "#94a3b8",
  },
  {
    id: "col_interview_prep",
    name: "Interview Prep",
    description: "Technical interview preparation",
    isFavorite: false,
    itemCount: 24,
    color: "#eab308",
  },
  {
    id: "col_git_commands",
    name: "Git Commands",
    description: "Frequently used git commands",
    isFavorite: true,
    itemCount: 15,
    color: "#f97316",
  },
  {
    id: "col_ai_prompts",
    name: "AI Prompts",
    description: "Curated AI prompts for coding",
    isFavorite: false,
    itemCount: 18,
    color: "#a855f7",
  },
];

export const mockItems: MockItem[] = [
  {
    id: "item_use_auth_hook",
    title: "useAuth Hook",
    description: "Custom authentication hook for React applications",
    contentType: "text",
    content:
      "export function useAuth() {\n  const [user, setUser] = useState(null);\n  useEffect(() => {\n    getSession().then(setUser);\n  }, []);\n  return { user, isAuthenticated: !!user };\n}",
    language: "typescript",
    url: null,
    fileName: null,
    fileSize: null,
    isFavorite: true,
    isPinned: true,
    typeId: "type_snippet",
    collectionId: "col_react_patterns",
    tags: ["react", "auth", "hooks"],
    updatedAt: "2025-01-15",
  },
  {
    id: "item_api_error_handling",
    title: "API Error Handling Pattern",
    description: "Fetch wrapper with exponential backoff retry logic",
    contentType: "text",
    content:
      "async function fetchWithRetry(url, options, retries = 3) {\n  for (let i = 0; i < retries; i++) {\n    try {\n      return await fetch(url, options);\n    } catch (err) {\n      if (i === retries - 1) throw err;\n      await new Promise((r) => setTimeout(r, 2 ** i * 1000));\n    }\n  }\n}",
    language: "javascript",
    url: null,
    fileName: null,
    fileSize: null,
    isFavorite: false,
    isPinned: true,
    typeId: "type_snippet",
    collectionId: "col_react_patterns",
    tags: ["api", "error-handling", "fetch"],
    updatedAt: "2025-01-12",
  },
  {
    id: "item_git_undo_commit",
    title: "Undo last commit (keep changes)",
    description: "Reset the last commit but keep the working tree",
    contentType: "text",
    content: "git reset --soft HEAD~1",
    language: "bash",
    url: null,
    fileName: null,
    fileSize: null,
    isFavorite: true,
    isPinned: false,
    typeId: "type_command",
    collectionId: "col_git_commands",
    tags: ["git", "reset"],
    updatedAt: "2025-01-11",
  },
  {
    id: "item_explain_code_prompt",
    title: "Explain Code Prompt",
    description: "Prompt for asking an LLM to explain a code block line by line",
    contentType: "text",
    content:
      "Explain the following code line by line. Call out edge cases, potential bugs, and time complexity.\n\n```\n{{code}}\n```",
    language: "markdown",
    url: null,
    fileName: null,
    fileSize: null,
    isFavorite: false,
    isPinned: false,
    typeId: "type_prompt",
    collectionId: "col_ai_prompts",
    tags: ["ai", "explain", "review"],
    updatedAt: "2025-01-09",
  },
  {
    id: "item_python_dedupe",
    title: "Deduplicate a list preserving order",
    description: "One-liner to remove duplicates while keeping first occurrence",
    contentType: "text",
    content: "deduped = list(dict.fromkeys(items))",
    language: "python",
    url: null,
    fileName: null,
    fileSize: null,
    isFavorite: false,
    isPinned: false,
    typeId: "type_snippet",
    collectionId: "col_python_snippets",
    tags: ["python", "list"],
    updatedAt: "2025-01-08",
  },
  {
    id: "item_big_o_notes",
    title: "Big-O Cheat Sheet",
    description: "Common time complexities for interview prep",
    contentType: "text",
    content:
      "- Array access: O(1)\n- Binary search: O(log n)\n- Hash map lookup: O(1) avg\n- Sorting: O(n log n)\n- Nested loops: O(n^2)",
    language: null,
    url: null,
    fileName: null,
    fileSize: null,
    isFavorite: false,
    isPinned: false,
    typeId: "type_note",
    collectionId: "col_interview_prep",
    tags: ["algorithms", "complexity"],
    updatedAt: "2025-01-06",
  },
  {
    id: "item_next_docs_link",
    title: "Next.js App Router Docs",
    description: "Official documentation for the App Router",
    contentType: "text",
    content: null,
    language: null,
    url: "https://nextjs.org/docs/app",
    fileName: null,
    fileSize: null,
    isFavorite: true,
    isPinned: false,
    typeId: "type_link",
    collectionId: null,
    tags: ["nextjs", "docs"],
    updatedAt: "2025-01-04",
  },
  {
    id: "item_claude_context_file",
    title: "CLAUDE.md Starter",
    description: "Base context file template for AI coding assistants",
    contentType: "file",
    content: null,
    language: null,
    url: null,
    fileName: "CLAUDE.md",
    fileSize: 2048,
    isFavorite: false,
    isPinned: false,
    typeId: "type_file",
    collectionId: "col_context_files",
    tags: ["ai", "context", "template"],
    updatedAt: "2025-01-02",
  },
];
