import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineCode, HiOutlineFolder, HiOutlinePhotograph, HiOutlineX, HiOutlineViewGrid, HiOutlineSparkles } from 'react-icons/hi';
import { technologyApi, categoryApi } from '../services/api';
import { useToast } from '../contexts/ToastContextStore';
import { Button, Input, Select, Modal, ConfirmDialog, LoadingSpinner, EmptyState } from '../components/ui';
import { formatHours } from '../constants';
import TechnologyIcon, { FolderContentIcon } from '../components/TechnologyIcon';

const COLORS = ['#6366F1', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#61DAFB', '#3178C6', '#3776AB'];
const EMPTY_TECH_FORM = { name: '', color: '#6366F1', category_id: '', custom_icon: null };
const EMPTY_FOLDER_FORM = { name: '', color: '#6366F1' };
const FOLDER_ORDER_KEY = 'devtracker:folder-order';
const techOrderKey = categoryId => `devtracker:technology-order:${categoryId || 'unfiled'}`;

function ColorPicker({ value, onChange }) {
  return <div className="flex gap-2.5 mt-2.5 flex-wrap">{COLORS.map(color => (
    <button key={color} type="button" onClick={() => onChange(color)} aria-label={`Use ${color}`}
      className={`w-8 h-8 rounded-xl transition-all duration-200 ${value === color ? 'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110' : 'hover:scale-105'}`}
      style={{ backgroundColor: color }} />
  ))}</div>;
}

function ordered(items, key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]').map(String);
    const positions = new Map(saved.map((id, index) => [id, index]));
    return [...items].sort((a, b) => (positions.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER) - (positions.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER));
  } catch { return items; }
}

function saveOrder(items, key) {
  localStorage.setItem(key, JSON.stringify(items.map(item => item.id)));
}

function swap(items, movingId, targetId) {
  const movingIndex = items.findIndex(item => String(item.id) === String(movingId));
  const targetIndex = items.findIndex(item => String(item.id) === String(targetId));
  if (movingIndex < 0 || targetIndex < 0 || movingIndex === targetIndex) return items;
  const next = [...items];
  [next[movingIndex], next[targetIndex]] = [next[targetIndex], next[movingIndex]];
  return next;
}

export default function Technologies() {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [technologies, setTechnologies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [draggingFolderId, setDraggingFolderId] = useState(null);
  const [draggingTechId, setDraggingTechId] = useState(null);
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingTech, setEditingTech] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [techForm, setTechForm] = useState(EMPTY_TECH_FORM);
  const [folderForm, setFolderForm] = useState(EMPTY_FOLDER_FORM);

  const load = useCallback(async () => {
    try {
      const [techResponse, folderResponse] = await Promise.all([technologyApi.getAll(), categoryApi.getAll()]);
      setTechnologies(techResponse.data || []);
      setCategories(ordered(folderResponse.data || [], FOLDER_ORDER_KEY));
    } catch (error) { toast.error(error.message); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const folders = useMemo(() => {
    const list = categories.map(folder => ({ ...folder, technologies: ordered(technologies.filter(tech => String(tech.category_id) === String(folder.id)), techOrderKey(folder.id)) }));
    const unfiled = technologies.filter(tech => !tech.category_id);
    if (unfiled.length) list.push({ id: 'unfiled', name: 'Unfiled', color: '#6B7280', technologies: ordered(unfiled, techOrderKey(null)), unfiled: true });
    return list;
  }, [categories, technologies]);
  const selectedFolder = folders.find(folder => String(folder.id) === String(selectedFolderId));

  const openCreateTech = (categoryId = '') => {
    setEditingTech(null);
    setTechForm({ ...EMPTY_TECH_FORM, category_id: categoryId && categoryId !== 'unfiled' ? String(categoryId) : '' });
    setTechModalOpen(true);
  };
  const openEditTech = tech => {
    setEditingTech(tech);
    setTechForm({ name: tech.name, color: tech.color, category_id: tech.category_id ? String(tech.category_id) : '', custom_icon: tech.custom_icon || null });
    setTechModalOpen(true);
  };
  const openCreateFolder = () => { setEditingFolder(null); setFolderForm(EMPTY_FOLDER_FORM); setFolderModalOpen(true); };
  const openEditFolder = folder => { setEditingFolder(folder); setFolderForm({ name: folder.name, color: folder.color }); setFolderModalOpen(true); };

  const handleIconChange = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.warning('Please select an image file'); return; }
    if (file.size > 750 * 1024) { toast.warning('Icon must be smaller than 750 KB'); return; }
    const reader = new FileReader();
    reader.onload = () => setTechForm(form => ({ ...form, custom_icon: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSaveTech = async () => {
    if (!techForm.name.trim()) return toast.warning('Name is required');
    const payload = { ...techForm, category_id: techForm.category_id ? String(techForm.category_id) : null };
    try {
      if (editingTech) { await technologyApi.update(editingTech.id, payload); toast.success('Technology updated'); }
      else { await technologyApi.create(payload); toast.success('Technology added'); }
      setTechModalOpen(false); load();
    } catch (error) { toast.error(error.message); }
  };

  const handleSaveFolder = async () => {
    if (!folderForm.name.trim()) return toast.warning('Folder name is required');
    try {
      if (editingFolder) { await categoryApi.update(editingFolder.id, folderForm); toast.success('Folder updated'); }
      else { await categoryApi.create(folderForm); toast.success('Folder added'); }
      setFolderModalOpen(false); load();
    } catch (error) { toast.error(error.message); }
  };

  const handleDelete = async () => {
    try {
      if (deleteTarget.type === 'folder') {
        await categoryApi.delete(deleteTarget.id);
        setSelectedFolderId(null);
        toast.success('Folder deleted; its technologies are now unfiled');
      } else { await technologyApi.delete(deleteTarget.id); toast.success('Technology deleted'); }
      load();
    } catch (error) { toast.error(error.message); }
  };

  const moveFolder = targetId => {
    if (!draggingFolderId || String(draggingFolderId) === String(targetId)) return;
    const next = swap(categories, draggingFolderId, targetId);
    setCategories(next);
    saveOrder(next, FOLDER_ORDER_KEY);
  };

  const moveTechnology = targetId => {
    if (!draggingTechId || !selectedFolder || String(draggingTechId) === String(targetId)) return;
    const current = selectedFolder.technologies;
    const next = swap(current, draggingTechId, targetId);
    const position = new Map(next.map((tech, index) => [String(tech.id), index]));
    setTechnologies(items => [...items].sort((a, b) => {
      if (String(a.category_id || 'unfiled') !== String(selectedFolder.id)) return 0;
      return (position.get(String(a.id)) ?? 0) - (position.get(String(b.id)) ?? 0);
    }));
    saveOrder(next, techOrderKey(selectedFolder.id === 'unfiled' ? null : selectedFolder.id));
  };

  if (loading) return <LoadingSpinner />;

  return <div className="space-y-7">
    <div className="animate-fade-in flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <HiOutlineSparkles size={16} />
          <span>Tech Stack</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Technologies</h1>
        <p className="text-text-muted text-xs sm:text-sm mt-1">Organize your technologies into custom folders & track total study time</p>
      </div>
      <div className="flex w-full gap-2.5 sm:w-auto">
        <Button className="flex-1 sm:flex-none" variant="outline" onClick={openCreateFolder}><HiOutlineFolder size={18} /> Add Folder</Button>
        <Button className="flex-1 sm:flex-none" onClick={() => openCreateTech()}><HiOutlinePlus size={18} /> Add Technology</Button>
      </div>
    </div>

    {!folders.length ? <EmptyState icon={HiOutlineCode} title="No folders yet" description="Create a folder, then add your technologies inside it." action={<Button onClick={openCreateFolder}><HiOutlinePlus size={18} /> Add Folder</Button>} /> : <div className="folder-grid" aria-label="Technology folders">
      {folders.map(folder => <article key={folder.id}
        onDragOver={event => event.preventDefault()}
        onDrop={event => { event.preventDefault(); moveFolder(folder.id); setDraggingFolderId(null); }}
        className={`folder-tile animate-fade-in ${draggingFolderId === folder.id ? 'is-dragging' : ''}`}
        style={{ '--folder-color': folder.color }}>
        <button className="folder-open-button" onClick={() => setSelectedFolderId(folder.id)} aria-label={`Open ${folder.name} folder`}>
          <span className="folder-icon-shell"><FolderContentIcon folder={folder} /></span>
          <span className="folder-tile-name">{folder.name}</span>
          <span className="folder-tile-count">{folder.technologies.length} {folder.technologies.length === 1 ? 'technology' : 'technologies'}</span>
        </button>
        {!folder.unfiled && <button type="button" draggable onDragStart={event => { event.stopPropagation(); event.dataTransfer.effectAllowed = 'move'; setDraggingFolderId(folder.id); }} onDragEnd={() => setDraggingFolderId(null)} onClick={event => event.stopPropagation()} className="drag-grip" title="Drag to move this folder" aria-label={`Drag ${folder.name} to a new position`}><HiOutlineViewGrid size={17} /></button>}
      </article>)}
    </div>}

    <Modal isOpen={!!selectedFolder} onClose={() => setSelectedFolderId(null)} title={selectedFolder ? `${selectedFolder.name} Folder` : ''} size="xl">
      {selectedFolder && <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface-lighter/40 px-4 py-3">
          <div className="flex items-center gap-3"><span className="folder-color-dot w-3 h-3 rounded-sm" style={{ '--folder-color': selectedFolder.color, backgroundColor: selectedFolder.color }} /><p className="text-xs text-text-muted">{selectedFolder.technologies.length} {selectedFolder.technologies.length === 1 ? 'technology' : 'technologies'} · drag grips to reorder</p></div>
          <div className="flex w-full gap-1.5 sm:w-auto">
            <Button className="flex-1 sm:flex-none" size="sm" onClick={() => openCreateTech(selectedFolder.id)}><HiOutlinePlus size={16} /> Add technology</Button>
            {!selectedFolder.unfiled && <><button onClick={() => openEditFolder(selectedFolder)} className="icon-action" title="Edit folder" aria-label={`Edit ${selectedFolder.name}`}><HiOutlinePencil size={16} /></button><button onClick={() => setDeleteTarget({ type: 'folder', id: selectedFolder.id, name: selectedFolder.name })} className="icon-action danger" title="Delete folder" aria-label={`Delete ${selectedFolder.name}`}><HiOutlineTrash size={16} /></button></>}
          </div>
        </div>
        {!selectedFolder.technologies.length ? <button onClick={() => openCreateTech(selectedFolder.id)} className="w-full rounded-2xl border border-dashed border-border py-12 text-xs font-semibold text-text-muted hover:border-primary/50 hover:text-primary transition-colors">+ Add a technology to {selectedFolder.name}</button> : <div className="technology-grid">
          {selectedFolder.technologies.map(tech => {
            const iconColor = tech.color?.toLowerCase() === '#000000' ? '#ffffff' : tech.color;
            return <article key={tech.id} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); moveTechnology(tech.id); setDraggingTechId(null); }} className={`technology-card technology-tile ${draggingTechId === tech.id ? 'is-dragging' : ''}`} style={{ '--tech-color': tech.color }}>
              <button className="technology-open-button" onClick={() => openEditTech(tech)} aria-label={`Edit ${tech.name}`}>
                <span className="technology-icon-frame" style={{ color: iconColor }}><TechnologyIcon technology={tech} size={24} /></span>
                <span className="min-w-0 text-left"><span className="block font-bold text-xs truncate text-text">{tech.name}</span><span className="block text-text-muted text-[11px] font-mono mt-1">{formatHours(parseFloat(tech.total_hours))} total</span></span>
              </button>
              <div className="technology-actions"><button type="button" draggable onDragStart={event => { event.stopPropagation(); event.dataTransfer.effectAllowed = 'move'; setDraggingTechId(tech.id); }} onDragEnd={() => setDraggingTechId(null)} onClick={event => event.stopPropagation()} className="drag-grip" title="Drag to move this technology" aria-label={`Drag ${tech.name} to a new position`}><HiOutlineViewGrid size={16} /></button><button onClick={() => openEditTech(tech)} className="icon-action" title="Edit technology" aria-label={`Edit ${tech.name}`}><HiOutlinePencil size={16} /></button><button onClick={() => setDeleteTarget({ type: 'technology', id: tech.id, name: tech.name })} className="icon-action danger" title="Delete technology" aria-label={`Delete ${tech.name}`}><HiOutlineTrash size={16} /></button></div>
            </article>;
          })}
        </div>}
      </div>}
    </Modal>

    <Modal isOpen={techModalOpen} onClose={() => setTechModalOpen(false)} title={editingTech ? 'Edit Technology' : 'Add Technology'}>
      <div className="space-y-4"><Input label="Name" value={techForm.name} onChange={event => setTechForm({ ...techForm, name: event.target.value })} placeholder="e.g. React, Python, Docker..." /><Select label="Folder" value={techForm.category_id} onChange={event => setTechForm({ ...techForm, category_id: event.target.value })} options={[{ value: '', label: 'Unfiled' }, ...categories.map(folder => ({ value: String(folder.id), label: folder.name }))]} /><div><label className="text-xs text-text-muted font-semibold uppercase tracking-wider">Accent Color</label><ColorPicker value={techForm.color} onChange={color => setTechForm({ ...techForm, color })} /></div><div><label className="text-xs text-text-muted font-semibold uppercase tracking-wider">Custom Icon <span className="font-normal text-text-muted/60">(optional, max 750 KB)</span></label><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconChange} /><div className="mt-2.5 flex flex-wrap items-center gap-3">{techForm.custom_icon ? <><img src={techForm.custom_icon} alt="Icon preview" className="w-12 h-12 rounded-xl object-cover border border-border" /><Button type="button" variant="ghost" size="sm" onClick={() => { setTechForm({ ...techForm, custom_icon: null }); if (fileInputRef.current) fileInputRef.current.value = ''; }}><HiOutlineX size={16} /> Remove</Button></> : <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><HiOutlinePhotograph size={17} /> Choose Image</Button>}</div></div><div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><Button className="w-full sm:w-auto" variant="ghost" onClick={() => setTechModalOpen(false)}>Cancel</Button><Button className="w-full sm:w-auto" onClick={handleSaveTech}>{editingTech ? 'Update' : 'Add Technology'}</Button></div></div>
    </Modal>

    <Modal isOpen={folderModalOpen} onClose={() => setFolderModalOpen(false)} title={editingFolder ? 'Edit Folder' : 'Add Folder'}>
      <div className="space-y-4"><Input label="Folder Name" value={folderForm.name} onChange={event => setFolderForm({ ...folderForm, name: event.target.value })} placeholder="e.g. Frontend, Machine Learning..." /><div><label className="text-xs text-text-muted font-semibold uppercase tracking-wider">Accent Color</label><ColorPicker value={folderForm.color} onChange={color => setFolderForm({ ...folderForm, color })} /></div><div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><Button className="w-full sm:w-auto" variant="ghost" onClick={() => setFolderModalOpen(false)}>Cancel</Button><Button className="w-full sm:w-auto" onClick={handleSaveFolder}>{editingFolder ? 'Update Folder' : 'Add Folder'}</Button></div></div>
    </Modal>

    <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title={`Delete ${deleteTarget?.type === 'folder' ? 'Folder' : 'Technology'}`} message={deleteTarget?.type === 'folder' ? `Delete “${deleteTarget?.name}”? Its technologies will stay, but move to Unfiled.` : 'Are you sure? Sessions using this technology cannot be deleted.'} />
  </div>;
}
