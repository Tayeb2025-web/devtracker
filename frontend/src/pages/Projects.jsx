import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineClock,
  HiOutlineFolder,
  HiOutlinePencil,
  HiOutlinePlay,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineSparkles,
} from 'react-icons/hi';
import { projectApi } from '../services/api';
import { useTimer } from '../contexts/TimerContextStore';
import { useToast } from '../contexts/ToastContextStore';
import { Button, Card, ConfirmDialog, EmptyState, Input, LoadingSpinner, Modal, Textarea, ColorPicker } from '../components/ui';
import { formatHours } from '../constants';

const EMPTY_PROJECT = { name: '', color: '#8B5CF6', description: '' };

export default function Projects() {
  const navigate = useNavigate();
  const toast = useToast();
  const stopwatch = useTimer();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await projectApi.getAll();
      setProjects(response.data || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setEditingProject(null);
    setProjectForm(EMPTY_PROJECT);
    setModalOpen(true);
  };

  const openEdit = (project) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      color: project.color || '#8B5CF6',
      description: project.description || '',
    });
    setModalOpen(true);
  };

  const saveProject = async (event) => {
    event.preventDefault();
    if (!projectForm.name.trim()) {
      toast.warning('Project name is required');
      return;
    }

    const payload = {
      ...projectForm,
      name: projectForm.name.trim(),
      description: projectForm.description.trim() || null,
    };
    try {
      if (editingProject) {
        await projectApi.update(editingProject.id, payload);
        toast.success('Project updated');
      } else {
        await projectApi.create(payload);
        toast.success('Project added');
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const deleteProject = async () => {
    try {
      await projectApi.delete(deleteTarget.id);
      toast.success('Project deleted');
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const startProjectStopwatch = (project) => {
    if (!stopwatch.isIdle) {
      toast.warning('Finish or reset the active stopwatch first');
      return;
    }
    stopwatch.start({ projectId: project.id, note: `Project: ${project.name}` });
    toast.success(`Stopwatch started for ${project.name}`);
  };

  const openProjectTimer = (project) => {
    if (!stopwatch.countdown.isIdle) {
      toast.warning('Finish or reset the active timer first');
      return;
    }
    stopwatch.countdown.setProjectId(project.id);
    stopwatch.countdown.setNote(`Project: ${project.name}`);
    navigate('/timer');
  };

  if (loading) return <LoadingSpinner />;

  const totalHours = projects.reduce((total, project) => total + Number(project.total_hours || 0), 0);

  return (
    <div className="space-y-7">
      <section className="animate-fade-in flex flex-col gap-5 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/15 via-surface-light to-violet-500/10 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between backdrop-blur-md shadow-2xl">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <HiOutlineSparkles size={16} />
            <span>Project Tracker</span>
          </div>
          <h1 className="text-2xl font-extrabold sm:text-3xl tracking-tight">Track time on the real projects you build.</h1>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-text-muted">Create projects, start the stopwatch directly, or select a project in the focus timer. Every session automatically accumulates on your total.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="rounded-2xl border border-white/10 bg-surface/60 px-5 py-3 text-xs backdrop-blur-md">
            <p className="text-text-muted uppercase tracking-wider font-semibold">Total Project Time</p>
            <p className="mt-1 text-2xl font-extrabold text-indigo-400 font-mono">{formatHours(totalHours)}</p>
          </div>
          <Button onClick={openCreate} className="py-3 px-6"><HiOutlinePlus size={18} /> Add Project</Button>
        </div>
      </section>

      {projects.length === 0 ? (
        <EmptyState
          icon={HiOutlineFolder}
          title="No projects yet"
          description="Add a project and start logging your development time against it."
          action={<Button onClick={openCreate}><HiOutlinePlus size={18} /> Add Project</Button>}
        />
      ) : (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-label="Your projects">
          {projects.map(project => (
            <Card key={project.id} hover className="animate-fade-in border border-border/80 p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ring-white/10 shadow-lg" style={{ backgroundColor: `${project.color}22`, color: project.color }}>
                    <HiOutlineFolder size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-text">{project.name}</h2>
                        <p className="mt-0.5 text-xs font-medium text-text-muted">{formatHours(Number(project.total_hours || 0))} logged</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button type="button" onClick={() => openEdit(project)} title="Edit project" className="rounded-xl p-2 text-text-muted transition-colors hover:bg-surface-lighter hover:text-text"><HiOutlinePencil size={16} /></button>
                        <button type="button" onClick={() => setDeleteTarget(project)} title="Delete project" className="rounded-xl p-2 text-text-muted transition-colors hover:bg-red-500/15 hover:text-red-400"><HiOutlineTrash size={16} /></button>
                      </div>
                    </div>
                    {project.description && <p className="mt-3 text-xs leading-relaxed text-text-muted">{project.description}</p>}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row">
                <Button size="sm" onClick={() => startProjectStopwatch(project)} disabled={!stopwatch.isIdle} className="flex-1 py-2"><HiOutlinePlay size={16} /> Start Stopwatch</Button>
                <Button size="sm" variant="outline" onClick={() => openProjectTimer(project)} disabled={!stopwatch.countdown.isIdle} className="flex-1 py-2"><HiOutlineClock size={16} /> Set Timer</Button>
              </div>
            </Card>
          ))}
        </section>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProject ? 'Edit Project' : 'Add Project'}>
        <form onSubmit={saveProject} className="space-y-4">
          <Input label="Project name" value={projectForm.name} onChange={event => setProjectForm(form => ({ ...form, name: event.target.value }))} placeholder="e.g. Codelume Web App" autoFocus />
          <div>
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">Accent Color</p>
            <ColorPicker value={projectForm.color} onChange={color => setProjectForm(form => ({ ...form, color }))} />
          </div>
          <Textarea label="Description (optional)" value={projectForm.description} onChange={event => setProjectForm(form => ({ ...form, description: event.target.value }))} placeholder="What are you building in this project?" rows={3} />
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingProject ? 'Save Changes' : 'Add Project'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteProject}
        title="Delete Project"
        message={`Delete “${deleteTarget?.name}”? Projects with saved sessions cannot be deleted.`}
      />
    </div>
  );
}
