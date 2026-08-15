import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type UIEvent } from 'react';
import {
  AlertTriangle, Archive, Check, CheckCircle2, Code2, Copy, Download, FileCode2,
  FilePlus2, Files, FolderOpen, FolderPlus, FolderTree, Languages, Pencil, Plus, RefreshCw, Search,
  ShieldCheck, Trash2, Upload, X, LogOut,
} from 'lucide-react';
import { apiClient, type FileRecord, type ProjectRecord } from './lib/api';
import { AuthModal } from './components/AuthModal';
import { onAuthStateChangedCallback, signOut as firebaseSignOut } from './lib/firebase';

type Lang = 'ar' | 'en';
type Modal = 'add' | 'import' | 'json-import' | 'new-project' | 'confirm-clear' | 'confirm-delete' | 'confirm-delete-project' | 'confirm-replace' | 'confirm-import-replace' | 'confirm-json-import' | null;
type PendingJsonImport = { tree: string; accepted: FileRecord[]; excluded: string[] };

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
    dir: 'rtl', brandSub: 'مساحة عمل سحابية', kicker: 'تركيب هادئ · دقيق', title: 'حوّل الهيكل إلى مساحة عمل',
    desc: 'الصق شجرة مشروعك، ثم أدخل الملفات داخل مساراتها دون أن نلمس حرفًا من الكود أو نعيد تنسيقه.', language: 'English',
    treeTitle: 'هيكل المشروع', treeCaption: 'الصق مخرجات tree أو أي قائمة مسارات. نقرأ الرموز والامتدادات تلقائيًا.', parse: 'استخراج المسارات',
    clear: 'مسح المساحة', sample: 'إدراج مثال', paths: 'مسار مقبول', detected: 'تم اكتشاف', emptyTree: 'لا توجد مسارات بعد', uploaded: 'تم رفعه', pending: 'بانتظار المحتوى',
    treeHint: 'أضف هيكلًا للبدء. المسارات ذات الامتدادات ستُقبل تلقائيًا.', filesTitle: 'الملفات المدخلة',
    filesCaption: 'ملفاتك محفوظة في السحابة.', add: 'إضافة ملف', import: 'استيراد متعدد',
    search: 'ابحث في المسارات...', noFiles: 'المساحة جاهزة لملفك الأول', noFilesCopy: 'أضف ملفًا يدويًا أو استورد حزمة بصيغة FILE. سيبقى المحتوى كما هو.',
    noResults: 'لا نتائج لهذا البحث', select: 'اختر ملفًا للمعاينة', selectCopy: 'ستظهر محتويات الملف هنا حرفيًا، مع أدوات النسخ والتعديل والحذف.',
    preview: 'معاينة الملف', edit: 'تعديل', save: 'حفظ التعديل', cancel: 'إلغاء', copy: 'نسخ', delete: 'حذف', lines: 'أسطر', chars: 'حرف',
    secure: 'بياناتك محفوظة بأمان', accepted: 'مسارات مقبولة', synced: 'محفوظ في السحابة', pathLabel: 'مسار الملف',
    pathHint: 'يجب أن يطابق مسارًا ظهر في الهيكل أعلاه.', contentLabel: 'محتوى الملف', contentHint: 'المسافات والأسطر محفوظة كما تكتبها تمامًا.',
    addTitle: 'إضافة ملف إلى الهيكل', importTitle: 'استيراد ملفات متعددة', importHint: 'استخدم الصيغة التالية لكل ملف، ويمكنك إضافة أكثر من ملف في عملية واحدة:',
    importPlaceholder: '=== FILE: src/App.tsx ===\nimport React from "react";\n\n=== FILE: package.json ===\n{\n  "name": "my-project"\n}',
    confirm: 'تأكيد', close: 'إغلاق', invalid: 'هذا المسار غير موجود في الهيكل. أضفه إلى الشجرة أولًا ثم حاول مجددًا.',
    replaceTitle: 'استبدال ملف موجود؟', replaceCopy: 'يوجد ملف بهذا المسار بالفعل. هل تريد استبدال محتواه؟', clearTitle: 'مسح مساحة العمل؟',
    clearCopy: 'سيُحذف الهيكل وكل الملفات المحفوظة. لا يمكن التراجع عن هذا الإجراء.', deleteTitle: 'حذف الملف؟',
    deleteCopy: 'سيُحذف هذا الملف من مساحة العمل.', yesClear: 'نعم، امسح كل شيء', yesDelete: 'نعم، احذف الملف', yesReplace: 'استبدال المحتوى',
    export: 'تصدير JSON', zip: 'تحميل ZIP', projectName: 'اسم المشروع', importedCount: 'ملف مستورد', changed: 'آخر تغيير', now: 'الآن', toastSaved: 'تم حفظ الملف',
    toastCopied: 'تم نسخ المحتوى', toastDeleted: 'تم حذف الملف', toastCleared: 'تم مسح مساحة العمل', toastImported: 'تم استيراد الملفات بنجاح',
    toastExported: 'تم تصدير نسخة JSON', importEmpty: 'أدخل ملفًا واحدًا على الأقل بالصيغة المطلوبة.', importInvalid: 'تعذر قراءة بعض المقاطع. تحقق من صيغة === FILE: path ===.',
    importExcluded: 'تم استبعاد مسار غير موجود في الهيكل', missingTree: 'أضف هيكل المشروع أولًا', keep: 'إبقاء الموجود',
    projects: 'المشاريع', projectNew: 'مشروع جديد', projectOpen: 'فتح المشروع', projectActive: 'المشروع الحالي',
    projectEmpty: 'لا توجد مشاريع', projectNameHint: 'اختر اسمًا واضحًا لتعود إليه لاحقًا.', newProjectTitle: 'إنشاء مشروع',
    newProjectCopy: 'سيُحفظ هذا المشروع في السحابة، ويمكنك العودة إليه في أي وقت.', createProject: 'إنشاء المشروع',
    deleteProject: 'حذف المشروع', deleteProjectTitle: 'حذف المشروع؟', deleteProjectCopy: 'سيُحذف المشروع وشجرته وملفاته. لا يمكن التراجع عن ذلك.',
    cannotDeleteLast: 'اترك مشروعًا واحدًا على الأقل.', savedNow: 'محفوظ للتو', savedAt: 'آخر حفظ',
    importFromDevice: 'رفع من الجهاز', importJson: 'استيراد JSON', importJsonTitle: 'استيراد نسخة JSON', importJsonHint: 'الصق ملف JSON صادرًا من مُركّب أو اختره من جهازك.', chooseJsonFile: 'اختيار ملف JSON', jsonPlaceholder: '{\n  "format": "project-assembler/v1",\n  "structure": "...",\n  "files": []\n}', jsonInvalid: 'ملف JSON غير صالح أو لا يحتوي على هيكل مشروع مفهوم.', jsonReplaceCopy: 'سيتم استبدال هيكل المشروع والملفات الحالية بالنسخة المستوردة.', jsonImported: 'تم استيراد نسخة JSON', unsafePath: 'المسار غير صالح أو غير آمن. استخدم مسارًا نسبيًا داخل المشروع.',
    signIn: 'تسجيل الدخول', signOut: 'تسجيل الخروج',
  },
  en: {
    dir: 'ltr', brandSub: 'cloud workspace', kicker: 'CALM BUILD · PRECISE', title: 'Turn structure into a workspace',
    desc: 'Paste a project tree, then place files inside its paths without touching a character of your code or reformatting it.', language: 'العربية',
    treeTitle: 'Project structure', treeCaption: 'Paste tree output or any path list. Symbols and extensions are detected automatically.', parse: 'Extract paths',
    clear: 'Clear workspace', sample: 'Insert example', paths: 'accepted paths', detected: 'detected', emptyTree: 'No paths yet', uploaded: 'Uploaded', pending: 'Waiting for content',
    treeHint: 'Add a structure to begin. Paths with extensions are accepted automatically.', filesTitle: 'Entered files',
    filesCaption: 'Files are saved in the cloud.', add: 'Add file', import: 'Import multiple', search: 'Search paths...',
    noFiles: 'Ready for your first file', noFilesCopy: 'Add a file manually or import a FILE bundle. Content stays exactly as entered.',
    noResults: 'No results for this search', select: 'Select a file to preview', selectCopy: 'File contents will appear here verbatim, with copy, edit and delete tools.',
    preview: 'File preview', edit: 'Edit', save: 'Save edit', cancel: 'Cancel', copy: 'Copy', delete: 'Delete', lines: 'lines', chars: 'chars',
    secure: 'Your data is securely stored', accepted: 'accepted paths', synced: 'saved in cloud', pathLabel: 'File path',
    pathHint: 'Must match a path found in the structure above.', contentLabel: 'File content', contentHint: 'Spaces and line breaks are preserved exactly as typed.',
    addTitle: 'Add file to structure', importTitle: 'Import multiple files', importHint: 'Use this format for every file; multiple files can be added at once:',
    importPlaceholder: '=== FILE: src/App.tsx ===\nimport React from "react";\n\n=== FILE: package.json ===\n{\n  "name": "my-project"\n}',
    confirm: 'Confirm', close: 'Close', invalid: 'This path is not in the structure. Add it to the tree first, then try again.',
    replaceTitle: 'Replace existing file?', replaceCopy: 'A file with this path already exists. Replace its content?', clearTitle: 'Clear workspace?',
    clearCopy: 'The structure and all saved files will be deleted. This cannot be undone.', deleteTitle: 'Delete file?',
    deleteCopy: 'This file will be removed from the workspace.', yesClear: 'Yes, clear everything', yesDelete: 'Yes, delete file', yesReplace: 'Replace content',
    export: 'Export JSON', zip: 'Download ZIP', projectName: 'Project name', importedCount: 'imported files', changed: 'last changed', now: 'now', toastSaved: 'File saved',
    toastCopied: 'Content copied', toastDeleted: 'File deleted', toastCleared: 'Workspace cleared', toastImported: 'Files imported successfully',
    toastExported: 'JSON copy exported', importEmpty: 'Add at least one file in the required format.', importInvalid: 'Some blocks could not be read. Check the === FILE: path === format.',
    importExcluded: 'Excluded path not found in structure', missingTree: 'Add a project structure first', keep: 'Keep existing',
    projects: 'Projects', projectNew: 'New project', projectOpen: 'Open project', projectActive: 'Current project',
    projectEmpty: 'No saved projects', projectNameHint: 'Choose a clear name so you can return later.', newProjectTitle: 'Create project',
    newProjectCopy: 'This project is saved in the cloud, ready whenever you return.', createProject: 'Create project',
    deleteProject: 'Delete project', deleteProjectTitle: 'Delete this project?', deleteProjectCopy: 'The project, its tree and files will be removed. This cannot be undone.',
    cannotDeleteLast: 'Keep at least one project.', savedNow: 'Saved just now', savedAt: 'Last saved',
    importFromDevice: 'Upload from device', importJson: 'Import JSON', importJsonTitle: 'Import JSON copy', importJsonHint: 'Paste a JSON export from Assembler or choose one from your device.', chooseJsonFile: 'Choose JSON file', jsonPlaceholder: '{\n  "format": "project-assembler/v1",\n  "structure": "...",\n  "files": []\n}', jsonInvalid: 'The JSON file is invalid or does not contain a readable project structure.', jsonReplaceCopy: 'This will replace the current project structure and files with the imported copy.', jsonImported: 'JSON copy imported', unsafePath: 'The path is invalid or unsafe. Use a relative path inside the project.',
    signIn: 'Sign In', signOut: 'Sign Out',
  },
} as const;

export default function AppWithApi() {
  const [lang, setLang] = useState<Lang>('en');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectRecord | null>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [pendingJson, setPendingJson] = useState<PendingJsonImport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editContent, setEditContent] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [addPath, setAddPath] = useState('');
  const [addContent, setAddContent] = useState('');
  const [importText, setImportText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const treeRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = tx[lang];

  useEffect(() => {
    const unsubscribe = onAuthStateChangedCallback(async (user) => {
      setIsAuthenticated(!!user);
      if (user) {
        loadProjects();
      } else {
        setCurrentProject(null);
        setProjects([]);
        setFiles([]);
        setPaths([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadProjects = async () => {
    try {
      const loadedProjects = await apiClient.getProjects();
      setProjects(loadedProjects);
      if (loadedProjects.length > 0 && !currentProject) {
        await loadProject(loadedProjects[0].id!);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      setToast({ message: 'Failed to load projects', type: 'error' });
    }
  };

  const loadProject = async (projectId: string) => {
    try {
      const project = await apiClient.getProject(projectId);
      setCurrentProject(project);
      setPaths(extractPaths(project.tree || ''));
      setFiles(project.files || []);
      setSelectedPath(null);
    } catch (error) {
      console.error('Failed to load project:', error);
      setToast({ message: 'Failed to load project', type: 'error' });
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut();
      setIsAuthenticated(false);
      setCurrentProject(null);
      setProjects([]);
      setFiles([]);
      setPaths([]);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const newProject = await apiClient.createProject(newProjectName, starterTree);
      setProjects([...projects, newProject]);
      await loadProject(newProject.id!);
      setNewProjectName('');
      setModal(null);
      setToast({ message: t.toastImported, type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to create project', type: 'error' });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await apiClient.deleteProject(projectId);
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);
      if (currentProject?.id === projectId) {
        setCurrentProject(updatedProjects[0] || null);
        if (updatedProjects[0]) {
          await loadProject(updatedProjects[0].id!);
        }
      }
      setModal(null);
      setToast({ message: t.toastDeleted, type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to delete project', type: 'error' });
    }
  };

  const handleUpdateProject = async () => {
    if (!currentProject) return;
    try {
      const updated = await apiClient.updateProject(currentProject.id!, {
        tree: currentProject.tree,
      });
      setCurrentProject(updated);
      setToast({ message: t.toastSaved, type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to update project', type: 'error' });
    }
  };

  const handleAddFile = async () => {
    if (!addPath.trim() || !currentProject) return;
    try {
      const newFile = await apiClient.createFile(currentProject.id!, addPath, addContent);
      setFiles([...files, newFile]);
      setAddPath('');
      setAddContent('');
      setModal(null);
      setToast({ message: t.toastImported, type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to add file', type: 'error' });
    }
  };

  const handleUpdateFile = async (fileId: string, newContent: string) => {
    try {
      await apiClient.updateFile(fileId, { content: newContent });
      setFiles(files.map(f => f.id === fileId ? { ...f, content: newContent } : f));
      setToast({ message: t.toastSaved, type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to update file', type: 'error' });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await apiClient.deleteFile(fileId);
      setFiles(files.filter(f => f.id !== fileId));
      if (selectedPath) {
        const file = files.find(f => f.id === fileId);
        if (file?.path === selectedPath) setSelectedPath(null);
      }
      setModal(null);
      setToast({ message: t.toastDeleted, type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to delete file', type: 'error' });
    }
  };

  const handleBulkImport = async () => {
    if (!currentProject) return;
    try {
      const importedFiles = parseImportFormat(importText);
      if (importedFiles.length === 0) {
        setToast({ message: t.importEmpty, type: 'error' });
        return;
      }
      await apiClient.bulkCreateFiles(currentProject.id!, importedFiles);
      const updatedFiles = await apiClient.getProjectFiles(currentProject.id!);
      setFiles(updatedFiles);
      setImportText('');
      setModal(null);
      setToast({ message: t.toastImported, type: 'success' });
    } catch (error) {
      setToast({ message: t.importInvalid, type: 'error' });
    }
  };

  // Helper functions (same as original)
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

  function looksLikeFile(value: string) {
    const name = value.split('/').pop() || value;
    return /^\.[^/]+$/.test(name)
      || /\.[a-zA-Z0-9]{1,16}$/.test(name)
      || /^(Dockerfile|Makefile|Gemfile|Procfile|LICENSE|README)$/i.test(name);
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
        if (candidate && looksLikeFile(candidate)) found.add(candidate);
        return;
      }
      const prefix = treeMatch[1];
      const name = treeMatch[2].replace(/\/$/, '').trim();
      if (!name || name === '.' || name.endsWith(':')) return;
      const depth = Math.floor(prefix.length / 4) + 1;
      while (stack.length >= depth) stack.pop();
      const fullPath = normalizePath([...stack, name].filter(Boolean).join('/'));
      if (looksLikeFile(name)) found.add(fullPath);
      else stack.push(name);
    });
    return [...found];
  }

  function parseImportFormat(input: string): FileRecord[] {
    const files: FileRecord[] = [];
    const regex = /=== FILE:\s*(.+?)\s*===([\s\S]*?)(?=== FILE:|$)/g;
    let match;
    while ((match = regex.exec(input)) !== null) {
      const path = match[1].trim();
      const content = match[2].trim();
      if (isSafeRelativePath(path)) {
        files.push({ path, content });
      }
    }
    return files;
  }

  const filteredFiles = files.filter(file =>
    file.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedFile = selectedPath ? files.find(f => f.path === selectedPath) : null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center" dir={t.dir}>
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <FolderTree className="w-16 h-16 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.title}</h1>
            <p className="text-gray-600">{t.desc}</p>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <LogIn size={20} />
            {t.signIn}
          </button>
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onAuthSuccess={() => {
              setIsAuthenticated(true);
              loadProjects();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" dir={t.dir}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FolderTree className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-sm text-gray-600">{t.brandSub}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {t.language}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut size={18} />
              {t.signOut}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Projects Sidebar */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{t.projects}</h2>
            <button
              onClick={() => setModal('new-project')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Plus size={18} />
              {t.projectNew}
            </button>
          </div>
          <div className="space-y-2">
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => loadProject(project.id!)}
                className={`p-3 rounded cursor-pointer transition-colors ${
                  currentProject?.id === project.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="font-medium">{project.name}</div>
                <div className="text-sm text-gray-500">
                  {project.files?.length || 0} files · {t.savedAt}
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="text-center text-gray-500 py-8">{t.projectEmpty}</div>
            )}
          </div>
        </div>

        {/* Current Project */}
        {currentProject && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tree Input */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">{t.treeTitle}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (treeRef.current) {
                        treeRef.current.value = starterTree;
                        setCurrentProject({ ...currentProject, tree: starterTree });
                        setPaths(extractPaths(starterTree));
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {t.sample}
                  </button>
                  <button
                    onClick={() => {
                      setCurrentProject({ ...currentProject, tree: '' });
                      setPaths([]);
                      if (treeRef.current) treeRef.current.value = '';
                    }}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    {t.clear}
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{t.treeCaption}</p>
              <textarea
                ref={treeRef}
                value={currentProject.tree}
                onChange={(e) => {
                  setCurrentProject({ ...currentProject, tree: e.target.value });
                  setPaths(extractPaths(e.target.value));
                }}
                onBlur={handleUpdateProject}
                className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t.emptyTree}
              />
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-gray-600">{t.paths}:</span>
                <span className="text-blue-600 font-medium">{paths.length}</span>
              </div>
            </div>

            {/* Files */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">{t.filesTitle}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModal('add')}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <FilePlus2 size={18} />
                    {t.add}
                  </button>
                  <button
                    onClick={() => setModal('import')}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Upload size={18} />
                    {t.import}
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{t.filesCaption}</p>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="h-64 overflow-y-auto">
                {filteredFiles.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>{t.noFiles}</p>
                    <p className="text-sm mt-1">{t.noFilesCopy}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredFiles.map(file => (
                      <div
                        key={file.id}
                        onClick={() => setSelectedPath(file.path)}
                        className={`p-3 rounded cursor-pointer transition-colors ${
                          selectedPath === file.path
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileCode2 size={16} className="text-gray-500" />
                          <span className="font-mono text-sm">{file.path}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* File Preview */}
            {selectedFile && (
              <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">{t.preview}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditContent(selectedFile.content);
                        setModal('confirm-replace');
                      }}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <Pencil size={18} />
                      {t.edit}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedFile.content);
                        setToast({ message: t.toastCopied, type: 'success' });
                      }}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-700"
                    >
                      <Copy size={18} />
                      {t.copy}
                    </button>
                    <button
                      onClick={() => setModal('confirm-delete')}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                      {t.delete}
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <span className="font-mono text-sm text-gray-600">{selectedFile.path}</span>
                </div>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{selectedFile.content}</code>
                </pre>
                <div className="mt-3 flex gap-4 text-sm text-gray-600">
                  <span>{selectedFile.content.split('\n').length} {t.lines}</span>
                  <span>{selectedFile.content.length} {t.chars}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {modal === 'new-project' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">{t.newProjectTitle}</h2>
            <p className="text-sm text-gray-600 mb-4">{t.newProjectCopy}</p>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder={t.projectNameHint}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              >
                {t.close}
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              >
                {t.createProject}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'add' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">{t.addTitle}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.pathLabel}</label>
                <input
                  type="text"
                  value={addPath}
                  onChange={(e) => setAddPath(e.target.value)}
                  placeholder={t.pathHint}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.contentLabel}</label>
                <textarea
                  value={addContent}
                  onChange={(e) => setAddContent(e.target.value)}
                  placeholder={t.contentHint}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleAddFile}
                disabled={!addPath.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'import' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold mb-4">{t.importTitle}</h2>
            <p className="text-sm text-gray-600 mb-4">{t.importHint}</p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={t.importPlaceholder}
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleBulkImport}
                disabled={!importText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'confirm-delete' && selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">{t.deleteTitle}</h2>
            <p className="text-sm text-gray-600 mb-4">{t.deleteCopy}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => selectedFile.id && handleDeleteFile(selectedFile.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {t.yesDelete}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'confirm-replace' && selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold mb-4">{t.edit}</h2>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => {
                  selectedFile.id && handleUpdateFile(selectedFile.id, editContent);
                  setModal(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toast.message}
        </div>
      )}
    </div>
  );
}
