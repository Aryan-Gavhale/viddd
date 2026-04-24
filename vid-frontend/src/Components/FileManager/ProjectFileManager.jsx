import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  FolderPlus,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  File,
  Search,
  Download,
  Loader2,
  ChevronRight,
  Home,
  Trash2,
  Clock,
  User,
} from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../../api/axiosInstance';

const FOLDER_MIME = 'application/x-directory';

function formatBytes(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  if (v < 1024 * 1024 * 1024) return `${(v / 1024 / 1024).toFixed(1)} MB`;
  return `${(v / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fileIcon(mime) {
  if (!mime || mime === FOLDER_MIME) return Folder;
  if (mime.startsWith('video/')) return Film;
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('audio/')) return Music;
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('archive')) return Archive;
  if (mime.includes('pdf') || mime.includes('document') || mime.includes('text/')) return FileText;
  return File;
}

function normalizePath(f) {
  if (f == null || f === '') return '/';
  let s = f.replace(/\\/g, '/').replace(/\/+/g, '/');
  if (!s.startsWith('/')) s = `/${s}`;
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s || '/';
}

function buildChildFolderPath(parent, name) {
  const p = normalizePath(parent);
  if (p === '/') return `/${name}`;
  return `${p}/${name}`;
}

export default function ProjectFileManager() {
  const { orderId: orderIdParam } = useParams();
  const orderId = parseInt(String(orderIdParam), 10);
  const [folder, setFolder] = useState('/');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadList = useCallback(async () => {
    if (Number.isNaN(orderId)) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (folder) q.set('folder', folder);
      if (debounced) q.set('q', debounced);
      const res = await axiosInstance.get(`/project-files/${orderId}/list?${q.toString()}`);
      const d = res.data?.data ?? res.data;
      setItems(Array.isArray(d?.files) ? d.files : []);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to load files');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [orderId, folder, debounced]);

  const loadFolders = useCallback(async () => {
    if (Number.isNaN(orderId)) return;
    try {
      const res = await axiosInstance.get(`/project-files/${orderId}/folders`);
      const d = res.data?.data ?? res.data;
      setMarkers(Array.isArray(d?.markers) ? d.markers : []);
    } catch (e) {
      console.error(e);
      setMarkers([]);
    }
  }, [orderId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  const tree = useMemo(() => {
    const byParent = new Map();
    for (const m of markers) {
      const p = normalizePath(m.folder);
      const name = m.fileName;
      if (!byParent.has(p)) byParent.set(p, []);
      byParent.get(p).push({ ...m, id: m.id, path: buildChildFolderPath(p, name) });
    }
    for (const [, arr] of byParent) {
      arr.sort((a, b) => a.fileName.localeCompare(b.fileName));
    }
    return byParent;
  }, [markers]);

  const enterFolder = (nameOrPath) => {
    if (nameOrPath.startsWith('/')) setFolder(normalizePath(nameOrPath));
    else setFolder(buildChildFolderPath(folder, nameOrPath));
  };

  const breadcrumb = useMemo(() => {
    const f = normalizePath(folder);
    if (f === '/') return [{ label: 'Root', path: '/' }];
    const parts = f.split('/').filter(Boolean);
    const out = [{ label: 'Root', path: '/' }];
    let acc = '';
    for (const p of parts) {
      acc = acc ? `${acc}/${p}` : `/${p}`;
      out.push({ label: p, path: acc });
    }
    return out;
  }, [folder]);

  const openDetails = async (row) => {
    setSelected(row);
    if (row.mimeType === FOLDER_MIME) return;
    setVersionsLoading(true);
    setVersions([]);
    try {
      const q = new URLSearchParams({
        orderId: String(orderId),
        fileName: row.fileName,
        folder: folder,
      });
      const res = await axiosInstance.get(`/project-files/versions?${q.toString()}`);
      const d = res.data?.data ?? res.data;
      setVersions(Array.isArray(d?.versions) ? d.versions : []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load versions');
    } finally {
      setVersionsLoading(false);
    }
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await axiosInstance.post('/project-files/folder', {
        orderId,
        name,
        parentFolder: folder,
      });
      toast.success('Folder created');
      setNewFolderName('');
      await loadList();
      await loadFolders();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await axiosInstance.post('/project-files/presign', {
        orderId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        folder,
      });
      const d = res.data?.data ?? res.data;
      const { uploadUrl, fileKey, headers: hdrs } = d;
      if (!uploadUrl || !fileKey) throw new Error('No upload URL');

      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': (hdrs && hdrs['Content-Type']) || file.type || 'application/octet-stream',
        },
        credentials: 'omit',
      });

      await axiosInstance.post('/project-files/upload', {
        orderId,
        fileName: file.name,
        fileKey,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        folder,
      });
      toast.success('Uploaded');
      await loadList();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (row) => {
    if (!row?.id) return;
    if (!window.confirm(`Remove "${row.fileName}"?`)) return;
    try {
      await axiosInstance.delete(`/project-files/${orderId}/file/${row.id}`);
      toast.success('Removed');
      if (selected?.id === row.id) setSelected(null);
      await loadList();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  const download = async (row) => {
    if (row.mimeType === FOLDER_MIME) {
      enterFolder(row.fileName);
      return;
    }
    try {
      const res = await axiosInstance.get(`/project-files/file/${row.id}/download`);
      const d = res.data?.data ?? res.data;
      const url = d?.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else throw new Error('No URL');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Download failed');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) void uploadFile(f);
  };

  if (Number.isNaN(orderId)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-slate-400">Invalid order id</div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Project files</h1>
            <p className="text-sm text-slate-500">Order #{orderId}</p>
          </div>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Search in this folder…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
            />
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1 text-sm text-slate-400">
          {breadcrumb.map((b, i) => (
            <div key={b.path} className="flex items-center">
              {i > 0 && <ChevronRight className="mx-1 h-4 w-4" />}
              <button
                type="button"
                onClick={() => setFolder(b.path)}
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition hover:bg-slate-800 hover:text-cyan-300 ${
                  i === 0 ? 'font-medium' : ''
                }`}
              >
                {i === 0 ? <Home className="h-3.5 w-3.5" /> : null}
                {b.label}
              </button>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(200px,280px)_1fr]">
          <aside className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Folders</h3>
            <FolderTree
              childrenMap={tree}
              current={normalizePath(folder)}
              onSelect={(p) => setFolder(p)}
            />
          </aside>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              <input
                type="text"
                placeholder="New folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={creating}
                onClick={createFolder}
                className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                New folder
              </button>
            </div>

            <div
              ref={dropRef}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
                drag
                  ? 'border-cyan-500 bg-cyan-950/30'
                  : 'border-slate-700 bg-slate-900/20 hover:border-slate-500'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void uploadFile(f);
                }}
              />
              {uploading ? (
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-500" />
              ) : (
                <p className="text-slate-400">
                  Drop a file here or <span className="text-cyan-400">browse</span> — uploads to the current folder
                </p>
              )}
            </div>

            <div className="min-h-[240px] rounded-xl border border-slate-800 bg-slate-900/20 p-4">
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((row) => (
                    <FileCard
                      key={row.id}
                      row={row}
                      onOpen={() =>
                        row.mimeType === FOLDER_MIME ? enterFolder(row.fileName) : openDetails(row)
                      }
                      onDelete={onDelete}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="col-span-full py-12 text-center text-slate-500">This folder is empty</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <DetailPanel
            row={selected}
            versions={versions}
            versionsLoading={versionsLoading}
            onClose={() => setSelected(null)}
            onDownload={download}
            onDelete={onDelete}
            formatBytes={formatBytes}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function FileCard({ row, onOpen, onDelete }) {
  const Icon = fileIcon(row.mimeType);
  const isDir = row.mimeType === FOLDER_MIME;
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onOpen}
      className="group flex flex-col items-stretch gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-left transition hover:border-cyan-800/50 hover:bg-slate-800/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`rounded-lg p-2 ${isDir ? 'bg-amber-500/20 text-amber-200' : 'bg-slate-800 text-cyan-300'}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row);
          }}
          className="rounded p-1 text-slate-500 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
          title="Remove"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <p className="truncate text-sm font-medium text-slate-200" title={row.fileName}>
        {row.fileName}
      </p>
      <p className="text-xs text-slate-500">
        {isDir ? 'Folder' : formatBytes(row.fileSize)} · v{row.version ?? 1}
      </p>
    </motion.button>
  );
}

function FolderTree({ childrenMap, current, onSelect, basePath = '/' }) {
  const kids = childrenMap.get(normalizePath(basePath)) || [];
  if (basePath === '/' && kids.length === 0) {
    return <p className="text-xs text-slate-500">No folders yet</p>;
  }
  return (
    <ul className="space-y-0.5 text-sm">
      {kids.map((node) => {
        const isActive = current === node.path;
        return (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => onSelect(node.path)}
              className={`flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left transition ${
                isActive ? 'bg-cyan-950/50 text-cyan-200' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Folder className="h-3.5 w-3.5 shrink-0 opacity-80" />
              <span className="truncate">{node.fileName}</span>
            </button>
            {childrenMap.has(node.path) && (childrenMap.get(node.path) || []).length > 0 ? (
              <div className="ml-2 border-l border-slate-800 pl-2">
                <FolderTree
                  childrenMap={childrenMap}
                  current={current}
                  onSelect={onSelect}
                  basePath={node.path}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function DetailPanel({ row, versions, versionsLoading, onClose, onDownload, onDelete, formatBytes }) {
  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      className="fixed inset-0 z-[100] flex justify-end"
    >
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-100">File details</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-500 hover:text-white">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-sm text-slate-300">
          <p className="mb-1 text-xs text-slate-500">Name</p>
          <p className="mb-4 break-words font-medium text-slate-100">{row.fileName}</p>
          <p className="mb-1 text-xs text-slate-500">Size</p>
          <p className="mb-4">{formatBytes(row.fileSize)}</p>
          <p className="mb-1 text-xs text-slate-500">Uploaded</p>
          <p className="mb-4 flex items-center gap-1 text-slate-300">
            <Clock className="h-3.5 w-3.5" />
            {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
          </p>
          <p className="mb-1 text-xs text-slate-500">Uploader</p>
          <p className="mb-4 flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {row.uploader
              ? `${row.uploader.firstname || ''} ${row.uploader.lastname || ''}`.trim() || row.uploader.email
              : '—'}
          </p>
          <p className="mb-1 text-xs text-slate-500">Version</p>
          <p className="mb-4">v{row.version ?? 1}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onDownload(row)}
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm text-white transition hover:bg-cyan-500"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              type="button"
              onClick={() => onDelete(row)}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-200 hover:bg-rose-950/50"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
          <h3 className="mb-2 mt-8 text-sm font-semibold text-slate-200">Version history</h3>
          {versionsLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
          ) : (
            <ol className="space-y-3 border-l-2 border-slate-800 pl-4">
              {versions.map((v) => (
                <li key={v.id} className="relative">
                  <span className="absolute -left-[9px] top-1.5 h-2 w-2 rounded-full bg-cyan-500" />
                  <p className="text-xs text-slate-500">
                    {v.createdAt ? new Date(v.createdAt).toLocaleString() : '—'}
                  </p>
                  <p className="font-medium">v{v.version} · {v.isLatest ? 'latest' : 'superseded'}</p>
                  <p className="text-slate-500">
                    {v.uploader
                      ? `${v.uploader.firstname || ''} ${v.uploader.lastname || ''}`.trim()
                      : '—'}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </motion.div>
  );
}
