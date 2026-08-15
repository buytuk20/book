import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type UIEvent } from 'react';
import {
  AlertTriangle, Archive, Check, CheckCircle2, Code2, Copy, Download, FileCode2,
  FilePlus2, Files, FolderOpen, FolderPlus, FolderTree, Languages, Pencil, Plus, RefreshCw, Search,
  ShieldCheck, Trash2, Upload, X,
} from 'lucide-react';

type Lang = 'ar' | 'en';
type FileRecord = { path: string; content: string; updatedAt: number };
type FileDraft = Pick<FileRecord, 'path' | 'content'>;
type ProjectRecord = { id: string; name: string; tree: string; files: FileRecord[]; createdAt: number; updatedAt: number };
type WorkspaceStore = { version: 2; activeId: string; projects: ProjectRecord[] };
type Modal = 'add' | 'import' | 'json-import' | 'new-project' | 'confirm-clear' | 'confirm-delete' | 'confirm-delete-project' | 'confirm-replace' | 'confirm-import-replace' | 'confirm-json-import' | null;
type PendingJsonImport = { tree: string; accepted: FileRecord[]; excluded: string[] };
const STORAGE_KEY = 'project-assembler-workspace-v1';
const PROJECTS_STORAGE_KEY = 'project-assembler-projects-v2';
const starterTree = `project-assembler/
├── src/
│   ├── App.tsx
│   ├── index.css
│   └── components/
│       └── ProjectHeader.tsx
├── public/
│   └── favicon.svg
├── package.json
└── README.md`;

const tx = {
  ar: {
    dir: 'rtl', brandSub: 'مساحة عمل محلية', kicker: 'تركيب هادئ · دقيق', title: 'حوّل الهيكل إلى مساحة عمل',
    desc: 'الصق شجرة مشروعك، ثم أدخل الملفات داخل مساراتها دون أن نلمس حرفًا من الكود أو نعيد تنسيقه.', language: 'English',
    treeTitle: 'هيكل المشروع', treeCaption: 'الصق مخرجات tree أو أي قائمة مسارات. نقرأ الرموز والامتدادات تلقائيًا.', parse: 'استخراج المسارات',
    clear: 'مسح المساحة', sample: 'إدراج مثال', paths: 'مسار مقبول', detected: 'تم اكتشاف', emptyTree: 'لا توجد مسارات بعد', uploaded: 'تم رفعه', pending: 'بانتظار المحتوى',
    treeHint: 'أضف هيكلًا للبدء. المسارات ذات الامتدادات ستُقبل تلقائيًا.', filesTitle: 'الملفات المدخلة',
    filesCaption: 'ملفاتك محفوظة محليًا في هذا المتصفح فقط.', add: 'إضافة ملف', import: 'استيراد متعدد',
    search: 'ابحث في المسارات...', noFiles: 'المساحة جاهزة لملفك الأول', noFilesCopy: 'أضف ملفًا يدويًا أو استورد حزمة بصيغة FILE. سيبقى المحتوى كما هو.',
    noResults: 'لا نتائج لهذا البحث', select: 'اختر ملفًا للمعاينة', selectCopy: 'ستظهر محتويات الملف هنا حرفيًا، مع أدوات النسخ والتعديل والحذف.',
    preview: 'معاينة الملف', edit: 'تعديل', save: 'حفظ التعديل', cancel: 'إلغاء', copy: 'نسخ', delete: 'حذف', lines: 'أسطر', chars: 'حرف',
    secure: 'بياناتك لا تغادر جهازك', accepted: 'مسارات مقبولة', synced: 'محفوظ محليًا', pathLabel: 'مسار الملف',
    pathHint: 'يجب أن يطابق مسارًا ظهر في الهيكل أعلاه.', contentLabel: 'محتوى الملف', contentHint: 'المسافات والأسطر محفوظة كما تكتبها تمامًا.',
    addTitle: 'إضافة ملف إلى الهيكل', importTitle: 'استيراد ملفات متعددة', importHint: 'استخدم الصيغة التالية لكل ملف، ويمكنك إضافة أكثر من ملف في عملية واحدة:',
    importPlaceholder: '=== FILE: src/App.tsx ===\nimport React from "react";\n\n=== FILE: package.json ===\n{\n  "name": "my-project"\n}',
    confirm: 'تأكيد', close: 'إغلاق', invalid: 'هذا المسار غير موجود في الهيكل. أضفه إلى الشجرة أولًا ثم حاول مجددًا.',
    replaceTitle: 'استبدال ملف موجود؟', replaceCopy: 'يوجد ملف بهذا المسار بالفعل. هل تريد استبدال محتواه؟', clearTitle: 'مسح مساحة العمل؟',
    clearCopy: 'سيُحذف الهيكل وكل الملفات المحفوظة محليًا. لا يمكن التراجع عن هذا الإجراء.', deleteTitle: 'حذف الملف؟',
    deleteCopy: 'سيُحذف هذا الملف من مساحة العمل المحلية.', yesClear: 'نعم، امسح كل شيء', yesDelete: 'نعم، احذف الملف', yesReplace: 'استبدال المحتوى',
    export: 'تصدير JSON', zip: 'تحميل ZIP', projectName: 'اسم المشروع', importedCount: 'ملف مستورد', changed: 'آخر تغيير', now: 'الآن', toastSaved: 'تم حفظ الملف محليًا',
    toastCopied: 'تم نسخ المحتوى', toastDeleted: 'تم حذف الملف', toastCleared: 'تم مسح مساحة العمل', toastImported: 'تم استيراد الملفات بنجاح',
    toastExported: 'تم تصدير نسخة JSON', importEmpty: 'أدخل ملفًا واحدًا على الأقل بالصيغة المطلوبة.', importInvalid: 'تعذر قراءة بعض المقاطع. تحقق من صيغة === FILE: path ===.',
    importExcluded: 'تم استبعاد مسار غير موجود في الهيكل', missingTree: 'أضف هيكل المشروع أولًا', keep: 'إبقاء الموجود',
    projects: 'المشاريع المحلية', projectNew: 'مشروع جديد', projectOpen: 'فتح المشروع', projectActive: 'المشروع الحالي',
    projectEmpty: 'لا توجد مشاريع محفوظة', projectNameHint: 'اختر اسمًا واضحًا لتعود إليه لاحقًا.', newProjectTitle: 'إنشاء مشروع محلي',
    newProjectCopy: 'سيُحفظ هذا المشروع على جهازك فقط، ويمكنك العودة إليه في أي وقت.', createProject: 'إنشاء المشروع',
    deleteProject: 'حذف المشروع', deleteProjectTitle: 'حذف المشروع المحلي؟', deleteProjectCopy: 'سيُحذف المشروع وشجرته وملفاته من هذا الجهاز. لا يمكن التراجع عن ذلك.',
    cannotDeleteLast: 'اترك مشروعًا واحدًا على الأقل في المساحة.', savedNow: 'محفوظ على هذا الجهاز', savedAt: 'آخر حفظ',
    importFromDevice: 'رفع من الجهاز', importJson: 'استيراد JSON', importJsonTitle: 'استيراد نسخة JSON', importJsonHint: 'الصق ملف JSON صادرًا من مُركّب أو اختره من جهازك.', chooseJsonFile: 'اختيار ملف JSON', jsonPlaceholder: '{\n  "format": "project-assembler/v1",\n  "structure": "...",\n  "files": []\n}', jsonInvalid: 'ملف JSON غير صالح أو لا يحتوي على هيكل مشروع مفهوم.', jsonReplaceCopy: 'سيتم استبدال هيكل المشروع والملفات الحالية بالنسخة المستوردة.', jsonImported: 'تم استيراد نسخة JSON', unsafePath: 'المسار غير صالح أو غير آمن. استخدم مسارًا نسبيًا داخل المشروع.',
  },
  en: {
    dir: 'ltr', brandSub: 'local workspace', kicker: 'CALM BUILD · PRECISE', title: 'Turn structure into a workspace',
    desc: 'Paste a project tree, then place files inside its paths without touching a character of your code or reformatting it.', language: 'العربية',
    treeTitle: 'Project structure', treeCaption: 'Paste tree output or any path list. Symbols and extensions are detected automatically.', parse: 'Extract paths',
    clear: 'Clear workspace', sample: 'Insert example', paths: 'accepted paths', detected: 'detected', emptyTree: 'No paths yet', uploaded: 'Uploaded', pending: 'Waiting for content',
    treeHint: 'Add a structure to begin. Paths with extensions are accepted automatically.', filesTitle: 'Entered files',
    filesCaption: 'Files are stored locally in this browser only.', add: 'Add file', import: 'Import multiple', search: 'Search paths...',
    noFiles: 'Ready for your first file', noFilesCopy: 'Add a file manually or import a FILE bundle. Content stays exactly as entered.',
    noResults: 'No results for this search', select: 'Select a file to preview', selectCopy: 'File contents will appear here verbatim, with copy, edit and delete tools.',
    preview: 'File preview', edit: 'Edit', save: 'Save edit', cancel: 'Cancel', copy: 'Copy', delete: 'Delete', lines: 'lines', chars: 'chars',
    secure: 'Your data never leaves this device', accepted: 'accepted paths', synced: 'saved locally', pathLabel: 'File path',
    pathHint: 'Must match a path found in the structure above.', contentLabel: 'File content', contentHint: 'Spaces and line breaks are preserved exactly as typed.',
    addTitle: 'Add file to structure', importTitle: 'Import multiple files', importHint: 'Use this format for every file; multiple files can be added at once:',
    importPlaceholder: '=== FILE: src/App.tsx ===\nimport React from "react";\n\n=== FILE: package.json ===\n{\n  "name": "my-project"\n}',
    confirm: 'Confirm', close: 'Close', invalid: 'This path is not in the structure. Add it to the tree first, then try again.',
    replaceTitle: 'Replace existing file?', replaceCopy: 'A file with this path already exists. Replace its content?', clearTitle: 'Clear workspace?',
    clearCopy: 'The structure and all locally saved files will be deleted. This cannot be undone.', deleteTitle: 'Delete file?',
    deleteCopy: 'This file will be removed from the local workspace.', yesClear: 'Yes, clear everything', yesDelete: 'Yes, delete file', yesReplace: 'Replace content',
    export: 'Export JSON', zip: 'Download ZIP', projectName: 'Project name', importedCount: 'imported files', changed: 'last changed', now: 'now', toastSaved: 'File saved locally',
    toastCopied: 'Content copied', toastDeleted: 'File deleted', toastCleared: 'Workspace cleared', toastImported: 'Files imported successfully',
    toastExported: 'JSON copy exported', importEmpty: 'Add at least one file in the required format.', importInvalid: 'Some blocks could not be read. Check the === FILE: path === format.',
    importExcluded: 'Excluded path not found in structure', missingTree: 'Add a project structure first', keep: 'Keep existing',
    projects: 'Local projects', projectNew: 'New project', projectOpen: 'Open project', projectActive: 'Current project',
    projectEmpty: 'No saved projects', projectNameHint: 'Choose a clear name so you can return later.', newProjectTitle: 'Create a local project',
    newProjectCopy: 'This project is saved on this device only, ready whenever you return.', createProject: 'Create project',
    deleteProject: 'Delete project', deleteProjectTitle: 'Delete this local project?', deleteProjectCopy: 'The project, its tree and files will be removed from this device. This cannot be undone.',
    cannotDeleteLast: 'Keep at least one project in your workspace.', savedNow: 'Saved on this device', savedAt: 'Last saved',
    importFromDevice: 'Upload from device', importJson: 'Import JSON', importJsonTitle: 'Import JSON copy', importJsonHint: 'Paste a JSON export from Assembler or choose one from your device.', chooseJsonFile: 'Choose JSON file', jsonPlaceholder: '{\n  "format": "project-assembler/v1",\n  "structure": "...",\n  "files": []\n}', jsonInvalid: 'The JSON file is invalid or does not contain a readable project structure.', jsonReplaceCopy: 'This will replace the current project structure and files with the imported copy.', jsonImported: 'JSON copy imported', unsafePath: 'The path is invalid or unsafe. Use a relative path inside the project.',
  },
} as const;

function makeProject(name: string, tree = '', files: FileRecord[] = []): ProjectRecord {
  const now = Date.now();
  return { id: `project-${now}-${Math.random().toString(36).slice(2, 8)}`, name: name.trim() || 'my-project', tree, files, createdAt: now, updatedAt: now };
}
function normalizeFileRecord(value: unknown): FileRecord | null {
  if (!value || typeof value !== 'object') return null;
  const file = value as Partial<FileRecord>;
  if (typeof file.path !== 'string' || !isSafeRelativePath(file.path)) return null;
  return {
    path: normalizePath(file.path),
    content: typeof file.content === 'string' ? file.content : '',
    updatedAt: typeof file.updatedAt === 'number' ? file.updatedAt : Date.now(),
  };
}
function normalizeFiles(value: unknown): FileRecord[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeFileRecord).filter((file): file is FileRecord => file !== null);
}
function readStored(): WorkspaceStore {
  try {
    const versioned = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY) || 'null');
    if (versioned?.version === 2 && Array.isArray(versioned.projects) && versioned.projects.length) {
      const projects = versioned.projects.map((project: Partial<ProjectRecord>, index: number) => ({
        ...makeProject(project.name || `project-${index + 1}`, typeof project.tree === 'string' ? project.tree : '', normalizeFiles(project.files)),
        ...project,
        id: typeof project.id === 'string' ? project.id : `project-${index + 1}`,
        name: typeof project.name === 'string' && project.name.trim() ? project.name : `project-${index + 1}`,
        tree: typeof project.tree === 'string' ? project.tree : '',
        files: normalizeFiles(project.files),
      })) as ProjectRecord[];
      const activeId = projects.some((project) => project.id === versioned.activeId) ? versioned.activeId : projects[0].id;
      return { version: 2, activeId, projects };
    }
    const legacy = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const tree = typeof legacy.tree === 'string' ? legacy.tree : starterTree;
    const files = normalizeFiles(legacy.files);
    const project = makeProject(typeof legacy.projectName === 'string' ? legacy.projectName : 'my-project', tree, files);
    return { version: 2, activeId: project.id, projects: [project] };
  } catch {
    const project = makeProject('my-project', starterTree, []);
    return { version: 2, activeId: project.id, projects: [project] };
  }
}
function normalizePath(value: string) {
  return value.trim().replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/\/+/g, '/');
}
function isSafeRelativePath(value: string) {
  const normalized = normalizePath(value);
  return Boolean(normalized)
    && !normalized.startsWith('/')
    && !/^[a-zA-Z]:\//.test(normalized)
    && !normalized.split('/').some((segment) => segment === '..');
}
function pathsMatch(left: string, right: string) {
  const a = normalizePath(left);
  const b = normalizePath(right);
  return Boolean(a && b && a === b);
}
function findMatchingPath(paths: string[], candidate: string) {
  if (!isSafeRelativePath(candidate)) return undefined;
  const normalizedCandidate = normalizePath(candidate);
  const safePaths = paths.filter(isSafeRelativePath).map(normalizePath);
  const exact = safePaths.find((path) => path === normalizedCandidate);
  if (exact) return exact;
  const suffixMatches = safePaths.filter((path) => path.endsWith(`/${normalizedCandidate}`));
  return suffixMatches.length === 1 ? suffixMatches[0] : undefined;
}
function looksLikeFile(value: string) {
  const name = value.split('/').pop() || value;
  return /^\.[^/]+$/.test(name)
    || /\.[a-zA-Z0-9]{1,16}$/.test(name)
    || /^(Dockerfile|Makefile|Gemfile|Procfile|LICENSE|README)$/i.test(name);
}
function addRootPrefix(rootPrefix: string, path: string) {
  const normalizedRoot = normalizePath(rootPrefix);
  const normalizedPath = normalizePath(path);
  if (!normalizedRoot || !normalizedPath || normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`)) return normalizedPath;
  return normalizePath(`${normalizedRoot}/${normalizedPath}`);
}
function extractPaths(input: string): string[] {
  const found = new Set<string>();
  const stack: string[] = [];
  let rootPrefix = '';
  input.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.replace(/\t/g, '    ');
    const treeMatch = line.match(/^(.*?)(?:├──|└──|├─|└─|[+`]-)\s*(.+?)\s*$/);
    if (!treeMatch) {
      const rawValue = line.trim();
      const candidate = normalizePath(rawValue.replace(/\/$/, ''));
      if (candidate && rawValue.endsWith('/') && !looksLikeFile(candidate) && !rootPrefix && !stack.length) {
        rootPrefix = candidate;
        return;
      }
      if (candidate && looksLikeFile(candidate)) found.add(addRootPrefix(rootPrefix, candidate));
      return;
    }
    const prefix = treeMatch[1];
    const name = treeMatch[2].replace(/\/$/, '').trim();
    if (!name || name === '.' || name.endsWith(':')) return;
    const depth = Math.floor(prefix.length / 4) + 1;
    while (stack.length >= depth) stack.pop();
    const fullPath = addRootPrefix(rootPrefix, normalizePath([...stack, name].filter(Boolean).join('/')));
    if (looksLikeFile(name)) found.add(fullPath);
    else stack.push(name);
  });
  return [...found];
}
function getStructureLines(input: string): { text: string; path?: string }[] {
  const stack: string[] = [];
  let rootPrefix = '';
  return input.split(/\r?\n/).map((rawLine) => {
    const line = rawLine.replace(/\t/g, '    ');
    const treeMatch = line.match(/^(.*?)(?:├──|└──|├─|└─|[+`]-)\s*(.+?)\s*$/);
    if (!treeMatch) {
      const rawValue = line.trim();
      const candidate = normalizePath(rawValue.replace(/\/$/, ''));
      if (candidate && rawValue.endsWith('/') && !looksLikeFile(candidate) && !rootPrefix && !stack.length) {
        rootPrefix = candidate;
        return { text: rawLine };
      }
      return { text: rawLine, path: candidate && looksLikeFile(candidate) ? addRootPrefix(rootPrefix, candidate) : undefined };
    }
    const prefix = treeMatch[1];
    const name = treeMatch[2].replace(/\/$/, '').trim();
    if (!name || name === '.' || name.endsWith(':')) return { text: rawLine };
    const depth = Math.floor(prefix.length / 4) + 1;
    while (stack.length >= depth) stack.pop();
    const fullPath = addRootPrefix(rootPrefix, normalizePath([...stack, name].filter(Boolean).join('/')));
    if (looksLikeFile(name)) return { text: rawLine, path: fullPath };
    stack.push(name);
    return { text: rawLine };
  });
}
function parseBundle(input: string) {
  const blocks = input.split(/^===\s*FILE:\s*(.*?)\s*===\s*$/m);
  const result: { path: string; content: string }[] = [];
  for (let i = 1; i < blocks.length; i += 2) if (blocks[i]?.trim()) result.push({ path: blocks[i].trim(), content: (blocks[i + 1] || '').replace(/^\r?\n/, '') });
  return result;
}
function parseProjectJson(input: string): { tree: string; files: FileRecord[] } | null {
  try {
    const payload = JSON.parse(input) as { structure?: unknown; tree?: unknown; files?: unknown };
    if (!payload || typeof payload !== 'object') return null;
    const tree = typeof payload.structure === 'string' ? payload.structure : typeof payload.tree === 'string' ? payload.tree : '';
    return { tree, files: normalizeFiles(payload.files) };
  } catch {
    return null;
  }
}
function zipCrc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zipU16(output: number[], value: number) {
  output.push(value & 0xff, (value >>> 8) & 0xff);
}
function zipU32(output: number[], value: number) {
  output.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}
function buildZip(files: FileRecord[], projectName: string) {
  const encoder = new TextEncoder();
  const root = normalizePath(projectName).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'my-project';
  const names = new Set<string>();
  const safeFiles = files
    .map((file) => ({ ...file, path: normalizePath(file.path) }))
    .filter((file) => isSafeRelativePath(file.path));
  safeFiles.forEach((file) => {
    const path = file.path;
    const parts = path.split('/');
    for (let index = 1; index < parts.length; index += 1) names.add(`${root}/${parts.slice(0, index).join('/')}/`);
    names.add(`${root}/${path}`);
  });
  const entries = [...names].sort((a, b) => {
    const aDirectory = a.endsWith('/');
    const bDirectory = b.endsWith('/');
    return aDirectory !== bDirectory ? (aDirectory ? -1 : 1) : a.localeCompare(b);
  });
  const output: number[] = [];
  const central: { name: Uint8Array; crc: number; size: number; offset: number; directory: boolean }[] = [];
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  entries.forEach((name) => {
    const directory = name.endsWith('/');
    const file = directory ? null : safeFiles.find((item) => `${root}/${item.path}` === name);
    const data = directory ? new Uint8Array() : encoder.encode(file?.content ?? '');
    const nameBytes = encoder.encode(name);
    const crc = zipCrc32(data);
    const offset = output.length;
    zipU32(output, 0x04034b50); zipU16(output, 20); zipU16(output, 0x800); zipU16(output, 0);
    zipU16(output, dosTime); zipU16(output, dosDate); zipU32(output, crc); zipU32(output, data.length);
    zipU32(output, data.length); zipU16(output, nameBytes.length); zipU16(output, 0);
    output.push(...nameBytes, ...data);
    central.push({ name: nameBytes, crc, size: data.length, offset, directory });
  });
  const centralOffset = output.length;
  central.forEach((entry) => {
    zipU32(output, 0x02014b50); zipU16(output, 20); zipU16(output, 20); zipU16(output, 0x800); zipU16(output, 0);
    zipU16(output, dosTime); zipU16(output, dosDate); zipU32(output, entry.crc); zipU32(output, entry.size);
    zipU32(output, entry.size); zipU16(output, entry.name.length); zipU16(output, 0); zipU16(output, 0);
    zipU16(output, 0); zipU16(output, 0); zipU32(output, entry.directory ? 0x10 : 0); zipU32(output, entry.offset);
    output.push(...entry.name);
  });
  const centralSize = output.length - centralOffset;
  zipU32(output, 0x06054b50); zipU16(output, 0); zipU16(output, 0); zipU16(output, central.length); zipU16(output, central.length);
  zipU32(output, centralSize); zipU32(output, centralOffset); zipU16(output, 0);
  return new Blob([Uint8Array.from(output)], { type: 'application/zip' });
}

function App() {
  const stored = useMemo(readStored, []);
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('project-assembler-lang') as Lang) || 'ar');
  const [projects, setProjects] = useState<ProjectRecord[]>(stored.projects);
  const [activeId, setActiveId] = useState(stored.activeId);
  const activeProject = projects.find((project) => project.id === activeId) || projects[0];
  const [tree, setTree] = useState(activeProject?.tree || '');
  const [files, setFiles] = useState<FileRecord[]>(activeProject?.files || []);
  const [projectName, setProjectName] = useState(activeProject?.name || 'my-project');
  const [selectedPath, setSelectedPath] = useState(activeProject?.files[0]?.path || '');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [editing, setEditing] = useState(false);
  const [fileForm, setFileForm] = useState<FileDraft>({ path: '', content: '' });
  const [bundleText, setBundleText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [formError, setFormError] = useState('');
  const [pendingFile, setPendingFile] = useState<FileRecord | null>(null);
  const [pendingImport, setPendingImport] = useState<{ accepted: FileRecord[]; excluded: string[] } | null>(null);
  const [pendingJsonImport, setPendingJsonImport] = useState<PendingJsonImport | null>(null);
  const [pendingDelete, setPendingDelete] = useState('');
  const [pendingProjectId, setPendingProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [toast, setToast] = useState('');
  const treeVisualRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const switchingProjectRef = useRef(false);
  const t = tx[lang];
  const paths = useMemo(() => extractPaths(tree), [tree]);
  const structureLines = useMemo(() => getStructureLines(tree), [tree]);
  const selected = files.find((file) => file.path === selectedPath) || null;
  const filteredFiles = useMemo(() => files.filter((file) => file.path.toLowerCase().includes(query.toLowerCase())), [files, query]);
  const uploadedPaths = useMemo(() => new Set(files.map((file) => normalizePath(file.path))), [files]);
  const isUploaded = (path?: string) => Boolean(path && findMatchingPath(paths, path) && [...uploadedPaths].some((uploadedPath) => findMatchingPath([path], uploadedPath)));
  const coverage = paths.length ? Math.min(100, Math.round((files.filter((f) => findMatchingPath(paths, f.path)).length / paths.length) * 100)) : 0;
  useEffect(() => {
    if (!activeProject) return;
    if (switchingProjectRef.current) {
      switchingProjectRef.current = false;
      return;
    }
    setProjects((current) => current.map((project) => project.id === activeId
      ? { ...project, name: projectName || 'my-project', tree, files, updatedAt: Date.now() }
      : project));
  }, [tree, files, projectName, activeId]); // local project draft is mirrored into the project registry
  useEffect(() => {
    if (!activeProject) return;
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify({ version: 2, activeId, projects }));
  }, [projects, activeId, activeProject]);
  useEffect(() => {
    if (!activeProject) return;
    setTree(activeProject.tree);
    setFiles(activeProject.files);
    setProjectName(activeProject.name);
    setSelectedPath(activeProject.files[0]?.path || '');
    setQuery('');
    setEditing(false);
  }, [activeId]); // intentionally only switches when the user opens another project
  useEffect(() => { localStorage.removeItem(STORAGE_KEY); }, []);
  useEffect(() => { localStorage.setItem('project-assembler-lang', lang); document.documentElement.lang = lang; document.documentElement.dir = t.dir; }, [lang, t.dir]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const closeModal = () => { setModal(null); setFormError(''); setPendingFile(null); setPendingImport(null); setPendingJsonImport(null); setPendingProjectId(''); };
  const openNewProject = () => { setNewProjectName(''); setFormError(''); setModal('new-project'); };
  const createProject = (event: FormEvent) => {
    event.preventDefault();
    const name = newProjectName.trim();
    if (!name) { setFormError(t.projectName); return; }
    const project = makeProject(name);
    switchingProjectRef.current = true;
    setProjects((current) => [...current, project]);
    setActiveId(project.id);
    setTree('');
    setFiles([]);
    setProjectName(project.name);
    setSelectedPath('');
    setModal(null);
    setToast(`${t.projectOpen}: ${project.name}`);
  };
  const openProject = (id: string) => {
    if (id === activeId) return;
    const project = projects.find((item) => item.id === id);
    if (!project) return;
    switchingProjectRef.current = true;
    setActiveId(id);
    setTree(project.tree);
    setFiles(project.files);
    setProjectName(project.name);
    setSelectedPath(project.files[0]?.path || '');
    setEditing(false);
    setToast(`${t.projectOpen}: ${project.name}`);
  };
  const requestDeleteProject = (id: string) => {
    if (projects.length <= 1) { setToast(t.cannotDeleteLast); return; }
    setPendingProjectId(id);
    setModal('confirm-delete-project');
  };
  const confirmDeleteProject = () => {
    if (projects.length <= 1) { closeModal(); setToast(t.cannotDeleteLast); return; }
    const next = projects.filter((project) => project.id !== pendingProjectId);
    const nextActive = pendingProjectId === activeId ? next[0].id : activeId;
    setProjects(next);
    if (pendingProjectId === activeId) {
      const project = next[0];
      switchingProjectRef.current = true;
      setTree(project.tree);
      setFiles(project.files);
      setProjectName(project.name);
      setSelectedPath(project.files[0]?.path || '');
    }
    setActiveId(nextActive);
    closeModal();
    setToast(t.toastDeleted);
  };
  const openAdd = () => { setFileForm({ path: '', content: '' }); setFormError(''); setModal('add'); };
  const openEditor = (file: FileRecord) => {
    setSelectedPath(file.path);
    setFileForm({
      path: typeof file.path === 'string' ? file.path : '',
      content: typeof file.content === 'string' ? file.content : '',
    });
    setEditing(true);
  };
  const saveRecord = (record: FileRecord, allowReplace = false) => {
    const matchedPath = findMatchingPath(paths, record.path);
    if (!matchedPath) { setFormError(t.invalid); return; }
    const normalizedRecord = { ...record, path: matchedPath };
    const exists = files.some((file) => pathsMatch(file.path, normalizedRecord.path));
    if (exists && !allowReplace) { setPendingFile(normalizedRecord); setModal('confirm-replace'); return; }
    setFiles((current) => exists ? current.map((file) => pathsMatch(file.path, normalizedRecord.path) ? normalizedRecord : file) : [...current, normalizedRecord]);
    setSelectedPath(normalizedRecord.path); setEditing(false); closeModal(); setToast(t.toastSaved);
  };
  const submitFile = (event: FormEvent) => {
    event.preventDefault();
    const record = { path: normalizePath(fileForm.path), content: fileForm.content, updatedAt: Date.now() };
    if (!record.path) { setFormError(t.pathLabel); return; }
    if (!isSafeRelativePath(record.path)) { setFormError(t.unsafePath); return; }
    saveRecord(record);
  };
  const commitBundle = (accepted: FileRecord[], excluded: string[]) => {
    const next = [...files];
    accepted.forEach((record) => {
      const index = next.findIndex((file) => pathsMatch(file.path, record.path));
      if (index >= 0) next[index] = record; else next.push(record);
    });
    setFiles(next); setSelectedPath(accepted[0]?.path || next[0]?.path || ''); closeModal();
    setToast(`${t.toastImported} · ${accepted.length} ${t.importedCount}${excluded.length ? ` · ${t.importExcluded}: ${excluded.join('، ')}` : ''}`);
  };
  const prepareImportedRecords = (records: { path: string; content: string }[]) => {
    if (!paths.length) { setToast(t.missingTree); return; }
    const excluded: string[] = [];
    const accepted: FileRecord[] = [];
    records.forEach((item) => {
      const matchedPath = findMatchingPath(paths, item.path);
      if (!matchedPath) {
        excluded.push(item.path);
        return;
      }
      const record = { path: matchedPath, content: item.content, updatedAt: Date.now() };
      const duplicateIndex = accepted.findIndex((existing) => pathsMatch(existing.path, record.path));
      if (duplicateIndex >= 0) accepted[duplicateIndex] = record;
      else accepted.push(record);
    });
    if (!accepted.length) { setFormError(`${t.importInvalid} ${t.importExcluded}.`); setModal('import'); return; }
    if (accepted.some((item) => files.some((file) => pathsMatch(file.path, item.path)))) {
      setPendingImport({ accepted, excluded }); setModal('confirm-import-replace'); return;
    }
    commitBundle(accepted, excluded);
  };
  const submitBundle = (event: FormEvent) => {
    event.preventDefault(); const bundle = parseBundle(bundleText);
    if (!bundle.length) { setFormError(t.importEmpty); return; }
    prepareImportedRecords(bundle);
  };
  const confirmImport = () => { if (pendingImport) commitBundle(pendingImport.accepted, pendingImport.excluded); };
  const submitJsonImport = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseProjectJson(jsonText);
    if (!parsed || !parsed.tree.trim()) { setFormError(t.jsonInvalid); return; }
    const nextPaths = extractPaths(parsed.tree);
    const excluded: string[] = [];
    const accepted: FileRecord[] = [];
    parsed.files.forEach((file) => {
      const matchedPath = findMatchingPath(nextPaths, file.path);
      if (!matchedPath) excluded.push(file.path);
      else accepted.push({ ...file, path: matchedPath, updatedAt: Date.now() });
    });
    if (parsed.files.length && !accepted.length) { setFormError(`${t.jsonInvalid} ${t.importExcluded}.`); return; }
    setPendingJsonImport({ tree: parsed.tree, accepted, excluded });
    setModal('confirm-json-import');
  };
  const confirmJsonImport = () => {
    if (!pendingJsonImport) return;
    setTree(pendingJsonImport.tree);
    setFiles(pendingJsonImport.accepted);
    setSelectedPath(pendingJsonImport.accepted[0]?.path || '');
    setEditing(false);
    closeModal();
    setToast(`${t.jsonImported}${pendingJsonImport.excluded.length ? ` · ${t.importExcluded}: ${pendingJsonImport.excluded.join('، ')}` : ''}`);
  };
  const handleDeviceFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (!selectedFiles.length) return;
    try {
      const records = await Promise.all(selectedFiles.map(async (file) => ({
        path: normalizePath((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name),
        content: await file.text(),
      })));
      prepareImportedRecords(records);
    } catch {
      setToast(lang === 'ar' ? 'تعذر قراءة أحد الملفات من الجهاز' : 'A device file could not be read');
    }
  };
  const handleJsonFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    try {
      setJsonText(await file.text());
      setFormError('');
      setModal('json-import');
    } catch {
      setToast(lang === 'ar' ? 'تعذر قراءة ملف JSON' : 'The JSON file could not be read');
    }
  };
  const deleteSelected = () => { if (selectedPath) { setPendingDelete(selectedPath); setModal('confirm-delete'); } };
  const confirmDelete = () => { setFiles((current) => current.filter((file) => file.path !== pendingDelete)); setSelectedPath(''); closeModal(); setToast(t.toastDeleted); };
  const clearWorkspace = () => { setTree(''); setFiles([]); setSelectedPath(''); setModal(null); setToast(t.toastCleared); };
  const copyContent = async () => { if (selected) { await navigator.clipboard?.writeText(selected.content); setToast(t.toastCopied); } };
  const syncTreeScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (!treeVisualRef.current) return;
    treeVisualRef.current.scrollTop = event.currentTarget.scrollTop;
    treeVisualRef.current.scrollLeft = event.currentTarget.scrollLeft;
  };
  const exportJson = () => { const payload = JSON.stringify({ format: 'project-assembler/v1', exportedAt: new Date().toISOString(), structure: tree, files: files.map(({ path, content }) => ({ path, content })) }, null, 2); const url = URL.createObjectURL(new Blob([payload], { type: 'application/json;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'project-assembler-export.json'; anchor.click(); URL.revokeObjectURL(url); setToast(t.toastExported); };
  const downloadZip = () => {
    if (!files.length) { setToast(lang === 'ar' ? 'أضف ملفًا واحدًا على الأقل قبل تحميل ZIP' : 'Add at least one file before downloading the ZIP'); return; }
    const blob = buildZip(files, projectName);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${normalizePath(projectName).replace(/[^a-zA-Z0-9._-]+/g, '-') || 'my-project'}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast(lang === 'ar' ? `تم إنشاء مجلد ${projectName || 'my-project'} وتحميله كملف ZIP` : `Created ${projectName || 'my-project'} folder and downloaded the ZIP`);
  };

   return <div className="workspace-shell" dir={t.dir}>
      <header className="topbar"><div className="topbar-inner"><div className="brand" data-testid="text-brand"><div className="brand-mark"><Code2 size={20} /></div><div className="brand-copy"><div className="brand-name">مُركّب</div><div className="brand-sub">{t.brandSub}</div></div></div><div className="top-actions"><span className="local-badge"><span className="status-dot" />{t.savedNow}</span><button className="language-button" data-testid="button-language" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Languages size={15} /><span>{t.language}</span></button><button className="icon-button" data-testid="button-export-top" onClick={exportJson} title={t.export}><Download size={17} /></button><button className="primary-button top-zip-button" data-testid="button-download-zip-top" onClick={downloadZip}><Archive size={15} />{t.zip}</button></div><input ref={fileInputRef} className="sr-only" type="file" multiple onChange={handleDeviceFiles} aria-label={t.importFromDevice} /><input ref={jsonInputRef} className="sr-only" type="file" accept=".json,application/json" onChange={handleJsonFile} aria-label={t.chooseJsonFile} /></div></header>
     <main className="shell-grid">
         <aside className="sidebar" data-testid="panel-sidebar"><div className="sidebar-kicker">{t.kicker}</div><div className="sidebar-heading-row"><h2 className="sidebar-title">{t.projects}</h2><button className="sidebar-add" data-testid="button-new-project" onClick={openNewProject} title={t.projectNew}><FolderPlus size={16} /></button></div><div className="project-list">{projects.map((project) => <div className={`project-row ${project.id === activeId ? 'active' : ''}`} key={project.id}><button className="project-open" data-testid={`button-open-project-${project.id}`} onClick={() => openProject(project.id)}><span className="project-glyph"><FolderOpen size={14} /></span><span className="project-row-copy"><strong>{project.name}</strong><small>{project.files.length} {t.filesTitle} · {project.tree ? extractPaths(project.tree).length : 0} {t.paths}</small></span></button><button className="project-delete" data-testid={`button-delete-project-${project.id}`} onClick={() => requestDeleteProject(project.id)} title={t.deleteProject}><Trash2 size={13} /></button></div>)}</div><div className="structure-box"><div className="structure-stat"><span className="structure-number">{paths.length}</span><span className="structure-label">{t.accepted}</span></div><div className="mini-progress"><span style={{ width: `${coverage}%` }} /></div><div className="structure-stat" style={{ marginTop: 10 }}><span className="structure-label">{files.length} {t.synced}</span><span className="structure-label">{coverage}%</span></div></div><div className="sidebar-section">{t.detected}</div><p className="sidebar-note">{t.secure}.</p><button className="primary-button" style={{ width: '100%', marginTop: 17 }} data-testid="button-download-zip-sidebar" onClick={downloadZip}><Archive size={15} />{t.zip}</button><button className="quiet-button sidebar-export" data-testid="button-export-sidebar" onClick={exportJson}><Download size={15} />{t.export}</button></aside>
         <section className="content-column"><div className="hero-row"><div><div className="eyebrow">01 / {t.kicker}</div><div className="active-project-label"><FolderOpen size={14} /> {t.projectActive}</div><h1 className="page-title">{projectName}</h1><p className="page-description">{t.desc}</p></div><div className="hero-actions"><label className="project-name-field"><span>{t.projectName}</span><input className="project-name-input" data-testid="input-project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="my-project" /></label><button className="quiet-button" data-testid="button-import" onClick={() => { setBundleText(''); setFormError(''); setModal('import'); }}><Upload size={15} />{t.import}</button><button className="quiet-button" data-testid="button-import-device" onClick={() => fileInputRef.current?.click()}><FilePlus2 size={15} />{t.importFromDevice}</button><button className="quiet-button" data-testid="button-import-json" onClick={() => { setJsonText(''); setFormError(''); setModal('json-import'); }}><Files size={15} />{t.importJson}</button><button className="primary-button" data-testid="button-add-file" onClick={openAdd}><Plus size={16} />{t.add}</button><button className="primary-button" data-testid="button-download-zip" onClick={downloadZip}><Archive size={15} />{t.zip}</button></div></div>
         <section className="workspace-card input-card" data-testid="card-structure"><div className="card-header"><div><h2 className="card-title">{t.treeTitle}</h2><p className="card-caption">{t.treeCaption}</p></div><div className="structure-header-status"><span className="status-pill"><span className="status-dot" />{paths.length} {t.paths}</span><span className="tree-legend"><span className="tree-legend-check">✓</span>{t.uploaded}</span></div></div><div className="tree-editor"><div className="tree-visual" ref={treeVisualRef} aria-hidden="true">{structureLines.map((line, index) => { const lineIsUploaded = isUploaded(line.path); return <div className="tree-visual-line" key={`${line.text}-${index}`}><span>{line.text || ' '}</span>{lineIsUploaded && <span className="tree-check" title={t.uploaded}>✓</span>}</div>; })}</div><textarea className="tree-input" data-testid="input-project-tree" value={tree} onChange={(event) => setTree(event.target.value)} onScroll={syncTreeScroll} placeholder={t.treeHint} spellCheck={false} /></div><div className="card-footer"><span data-testid="status-structure"><FolderTree size={14} /> {paths.length ? `${paths.length} ${t.detected}` : t.emptyTree}</span><div className="footer-actions"><button className="quiet-button" data-testid="button-sample" onClick={() => setTree(starterTree)}><RefreshCw size={14} />{t.sample}</button><button className="danger-button" data-testid="button-clear" onClick={() => setModal('confirm-clear')}><Trash2 size={14} />{t.clear}</button></div></div></section>
        {!paths.length && <div className="notice warning" data-testid="notice-no-structure"><AlertTriangle size={16} />{t.treeHint}</div>}
        <div className="files-layout"><section className="workspace-card files-panel" data-testid="panel-files"><div className="card-header"><div><h2 className="card-title">{t.filesTitle}</h2><p className="card-caption">{t.filesCaption}</p></div><Files size={18} color="hsl(var(--primary))" /></div><div className="search-wrap"><Search size={15} /><label className="sr-only" htmlFor="file-search">{t.search}</label><input id="file-search" className="search-input" data-testid="input-file-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></div><div className="file-list">{!files.length ? <div className="empty-state"><div className="empty-icon"><FilePlus2 size={21} /></div><h3 className="empty-title">{t.noFiles}</h3><p className="empty-copy">{t.noFilesCopy}</p><button className="primary-button" style={{ marginTop: 17 }} data-testid="button-add-empty" onClick={openAdd}><Plus size={15} />{t.add}</button></div> : !filteredFiles.length ? <div className="empty-state"><div className="empty-icon"><Search size={20} /></div><h3 className="empty-title">{t.noResults}</h3></div> : filteredFiles.map((file) => <div className={`file-row ${selectedPath === file.path ? 'active' : ''}`} key={file.path} data-testid={`row-file-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`} onClick={() => { setSelectedPath(file.path); setEditing(false); }}><FileCode2 size={16} className="file-icon" /><div className="file-info"><div className="file-path">{file.path}</div><div className="file-meta">{file.content.split('\n').length} {t.lines} · {file.content.length} {t.chars}</div></div><div className="file-actions"><button className="tiny-button" data-testid={`button-edit-${file.path}`} title={t.edit} onClick={(event) => { event.stopPropagation(); openEditor(file); }}><Pencil size={14} /></button><button className="tiny-button" data-testid={`button-delete-${file.path}`} title={t.delete} onClick={(event) => { event.stopPropagation(); setPendingDelete(file.path); setModal('confirm-delete'); }}><Trash2 size={14} /></button></div></div>)}</div></section>
           <section className="workspace-card preview-panel" data-testid="panel-preview">{!selected ? <div className="preview-empty"><div className="empty-state"><div className="empty-icon"><Archive size={21} /></div><h3 className="empty-title">{t.select}</h3><p className="empty-copy">{t.selectCopy}</p></div></div> : <><div className="preview-header"><div style={{ minWidth: 0 }}><div className="preview-path" data-testid="text-selected-path">{selected.path}</div><div className="preview-sub">{selected.content.split('\n').length} {t.lines} · {selected.content.length} {t.chars} · {t.changed} {t.now}</div></div><div className="preview-actions">{editing ? <><button className="quiet-button" data-testid="button-cancel-edit" onClick={() => setEditing(false)}>{t.cancel}</button><button className="primary-button" data-testid="button-save-edit" onClick={() => saveRecord({ ...selected, content: fileForm.content, updatedAt: Date.now() }, true)}><Check size={14} />{t.save}</button></> : <><button className="quiet-button" data-testid="button-copy-file" onClick={copyContent}><Copy size={14} />{t.copy}</button><button className="quiet-button" data-testid="button-edit-file" onClick={() => openEditor(selected)}><Pencil size={14} />{t.edit}</button><button className="danger-button" data-testid="button-delete-file" onClick={deleteSelected}><Trash2 size={14} /></button></>}</div></div>{editing ? <textarea key={selected.path} className="editor" data-testid="textarea-edit-content" value={fileForm.content} onChange={(event) => setFileForm((form) => ({ ...form, content: event.target.value }))} spellCheck={false} /> : <pre className="code-view" data-testid="code-preview">{selected.content || ' '}</pre>}</>}</section></div>
        <div className="bottom-note"><ShieldCheck size={14} />{t.secure}<span>·</span><CheckCircle2 size={14} />{t.synced}</div>
      </section>
    </main>
    {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
       {modal === 'new-project' && <div className="modal compact-modal" role="dialog" aria-modal="true"><div className="modal-head"><div><h2 className="modal-title">{t.newProjectTitle}</h2><p className="card-caption">{t.newProjectCopy}</p></div><button className="icon-button" data-testid="button-close-new-project" onClick={closeModal}><X size={18} /></button></div><form onSubmit={createProject}><div className="modal-body"><label className="field"><span className="field-label">{t.projectName}</span><input className="text-input" data-testid="input-new-project-name" value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="client-portal" autoFocus /><span className="field-hint">{t.projectNameHint}</span></label></div>{formError && <div className="form-error" data-testid="status-new-project-error"><AlertTriangle size={15} />{formError}</div>}<div className="modal-actions"><button type="button" className="quiet-button" data-testid="button-cancel-new-project" onClick={closeModal}>{t.cancel}</button><button type="submit" className="primary-button" data-testid="button-confirm-new-project"><FolderPlus size={15} />{t.createProject}</button></div></form></div>}
       {modal === 'add' && <div className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><h2 className="modal-title">{t.addTitle}</h2><p className="card-caption">{t.pathHint}</p></div><button className="icon-button" data-testid="button-close-add" onClick={closeModal}><X size={18} /></button></div><form onSubmit={submitFile}><div className="modal-body"><label className="field"><span className="field-label">{t.pathLabel}</span><input className="text-input" data-testid="input-file-path" value={fileForm.path} onChange={(event) => setFileForm((form) => ({ ...form, path: event.target.value }))} placeholder="src/components/App.tsx" autoFocus /><span className="field-hint">{t.pathHint}</span></label><label className="field"><span className="field-label">{t.contentLabel}</span><textarea className="modal-textarea" data-testid="textarea-file-content" value={fileForm.content} onChange={(event) => setFileForm((form) => ({ ...form, content: event.target.value }))} placeholder={'export function App() {\n  return null;\n}'} spellCheck={false} /><span className="field-hint">{t.contentHint}</span></label></div>{formError && <div className="form-error" data-testid="status-form-error"><AlertTriangle size={15} />{formError}</div>}<div className="modal-actions"><button type="button" className="quiet-button" data-testid="button-cancel-add" onClick={closeModal}>{t.cancel}</button><button type="submit" className="primary-button" data-testid="button-confirm-add"><Check size={15} />{t.confirm}</button></div></form></div>}
        {modal === 'import' && <div className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><h2 className="modal-title">{t.importTitle}</h2><p className="card-caption">{t.importHint}</p></div><button className="icon-button" data-testid="button-close-import" onClick={closeModal}><X size={18} /></button></div><form onSubmit={submitBundle}><div className="modal-body"><div className="import-source-row"><span className="field-hint">{t.importFromDevice}</span><button type="button" className="quiet-button" data-testid="button-import-device-modal" onClick={() => fileInputRef.current?.click()}><FilePlus2 size={15} />{t.importFromDevice}</button></div><textarea className="modal-textarea" style={{ minHeight: 340 }} data-testid="textarea-import-bundle" value={bundleText} onChange={(event) => setBundleText(event.target.value)} placeholder={t.importPlaceholder} spellCheck={false} autoFocus /></div>{formError && <div className="form-error" data-testid="status-import-error"><AlertTriangle size={15} />{formError}</div>}<div className="modal-actions"><button type="button" className="quiet-button" data-testid="button-cancel-import" onClick={closeModal}>{t.cancel}</button><button type="submit" className="primary-button" data-testid="button-confirm-import"><Upload size={15} />{t.import}</button></div></form></div>}
        {modal === 'json-import' && <div className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><h2 className="modal-title">{t.importJsonTitle}</h2><p className="card-caption">{t.importJsonHint}</p></div><button className="icon-button" data-testid="button-close-json-import" onClick={closeModal}><X size={18} /></button></div><form onSubmit={submitJsonImport}><div className="modal-body"><div className="import-source-row"><span className="field-hint">{t.chooseJsonFile}</span><button type="button" className="quiet-button" data-testid="button-choose-json-file" onClick={() => jsonInputRef.current?.click()}><Files size={15} />{t.chooseJsonFile}</button></div><textarea className="modal-textarea" data-testid="textarea-json-import" value={jsonText} onChange={(event) => setJsonText(event.target.value)} placeholder={t.jsonPlaceholder} spellCheck={false} autoFocus /></div>{formError && <div className="form-error" data-testid="status-json-import-error"><AlertTriangle size={15} />{formError}</div>}<div className="modal-actions"><button type="button" className="quiet-button" data-testid="button-cancel-json-import" onClick={closeModal}>{t.cancel}</button><button type="submit" className="primary-button" data-testid="button-confirm-json-import"><Files size={15} />{t.importJson}</button></div></form></div>}
       {modal === 'confirm-import-replace' && <div className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><h2 className="modal-title">{t.replaceTitle}</h2><p className="card-caption">{t.replaceCopy}</p></div><button className="icon-button" data-testid="button-close-import-replace" onClick={closeModal}><X size={18} /></button></div><div className="modal-body"><div className="notice warning" style={{ margin: 0 }}><AlertTriangle size={16} />{t.replaceCopy}</div></div><div className="modal-actions"><button className="quiet-button" data-testid="button-keep-import-existing" onClick={closeModal}>{t.keep}</button><button className="quiet-button" data-testid="button-cancel-import-replace" onClick={closeModal}>{t.cancel}</button><button className="danger-button" data-testid="button-confirm-import-replace" onClick={confirmImport}>{t.yesReplace}</button></div></div>}
        {modal === 'confirm-json-import' && <div className="modal compact-modal" role="dialog" aria-modal="true"><div className="modal-head"><div><h2 className="modal-title">{t.importJsonTitle}</h2><p className="card-caption">{t.jsonReplaceCopy}</p></div><button className="icon-button" data-testid="button-close-json-confirm" onClick={closeModal}><X size={18} /></button></div><div className="modal-body"><div className="notice warning" style={{ margin: 0 }}><AlertTriangle size={16} />{t.jsonReplaceCopy}</div><div className="confirm-path">{pendingJsonImport?.accepted.length || 0} {t.importedCount}</div></div><div className="modal-actions"><button className="quiet-button" data-testid="button-cancel-json-confirm" onClick={closeModal}>{t.cancel}</button><button className="danger-button" data-testid="button-confirm-json-replace" onClick={confirmJsonImport}>{t.yesReplace}</button></div></div>}
       {modal === 'confirm-delete-project' && <div className="modal compact-modal" role="dialog" aria-modal="true"><div className="modal-head"><div><h2 className="modal-title">{t.deleteProjectTitle}</h2><p className="card-caption">{t.deleteProjectCopy}</p></div><button className="icon-button" data-testid="button-close-delete-project" onClick={closeModal}><X size={18} /></button></div><div className="modal-body"><div className="confirm-path">{projects.find((project) => project.id === pendingProjectId)?.name}</div></div><div className="modal-actions"><button className="quiet-button" data-testid="button-cancel-delete-project" onClick={closeModal}>{t.cancel}</button><button className="danger-button" data-testid="button-confirm-delete-project" onClick={confirmDeleteProject}><Trash2 size={14} />{t.deleteProject}</button></div></div>}
       {(modal === 'confirm-replace' || modal === 'confirm-clear' || modal === 'confirm-delete') && <div className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><h2 className="modal-title">{modal === 'confirm-replace' ? t.replaceTitle : modal === 'confirm-clear' ? t.clearTitle : t.deleteTitle}</h2><p className="card-caption">{modal === 'confirm-replace' ? t.replaceCopy : modal === 'confirm-clear' ? t.clearCopy : t.deleteCopy}</p></div><button className="icon-button" data-testid="button-close-confirm" onClick={closeModal}><X size={18} /></button></div><div className="modal-body">{modal === 'confirm-replace' ? <div className="confirm-path">{pendingFile?.path}</div> : modal === 'confirm-delete' ? <div className="confirm-path">{pendingDelete}</div> : <div className="notice warning" style={{ margin: 0 }}><AlertTriangle size={16} />{t.clearCopy}</div>}</div><div className="modal-actions">{modal === 'confirm-replace' && <button className="quiet-button" data-testid="button-keep-existing" onClick={closeModal}>{t.keep}</button>}<button className="quiet-button" data-testid="button-cancel-confirm" onClick={closeModal}>{t.cancel}</button><button className="danger-button" data-testid="button-confirm-danger" onClick={modal === 'confirm-replace' ? () => pendingFile && saveRecord(pendingFile, true) : modal === 'confirm-delete' ? confirmDelete : clearWorkspace}>{modal === 'confirm-replace' ? t.yesReplace : modal === 'confirm-delete' ? t.yesDelete : t.yesClear}</button></div></div>}
    </div>}
    {toast && <div className="toast" role="status" data-testid="status-toast"><CheckCircle2 size={16} color="hsl(var(--accent))" />{toast}</div>}
  </div>;
}
export default App;