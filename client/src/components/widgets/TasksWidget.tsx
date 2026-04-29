import { useEffect, useState } from 'react';
import { CheckSquare, ExternalLink, Link2, Plus, Search, Trash2, Square } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Task } from '@/types';
import api from '@/lib/api';

interface AsanaStatus {
  configured: boolean;
  connected: boolean;
  connection: {
    userName?: string | null;
    userEmail?: string | null;
    workspaceName?: string | null;
  } | null;
}

interface AsanaSearchResult {
  gid: string;
  name: string;
  completed: boolean;
  permalinkUrl?: string;
  dueOn: string | null;
}

export default function TasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [adding, setAdding] = useState(false);
  const [asanaStatus, setAsanaStatus] = useState<AsanaStatus | null>(null);
  const [searching, setSearching] = useState(false);
  const [asanaResults, setAsanaResults] = useState<AsanaSearchResult[]>([]);

  useEffect(() => {
    api.get('/tasks').then((res) => {
      setTasks(res.data.data.tasks);
      setLoading(false);
    }).catch(() => setLoading(false));

    api.get('/asana/status').then((res) => {
      setAsanaStatus(res.data.data);
    }).catch(() => {
      setAsanaStatus({ configured: false, connected: false, connection: null });
    });
  }, []);

  useEffect(() => {
    if (!asanaStatus?.connected || newTask.trim().length < 2) {
      setAsanaResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/asana/tasks/search', { params: { q: newTask.trim() } });
        setAsanaResults(res.data.data.tasks);
      } catch (error: any) {
        setAsanaResults([]);
        if (error.response?.data?.code === 'ASANA_SEARCH_PREMIUM_REQUIRED') {
          toast.error('Asana task search requires a premium Asana workspace');
        }
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [asanaStatus?.connected, newTask]);

  const connectAsana = async () => {
    try {
      const res = await api.post('/asana/connect');
      window.location.href = res.data.data.url;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Asana is not configured');
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const optimistic: Task = {
      id: `temp-${Date.now()}`,
      userId: '',
      title: newTask.trim(),
      isCompleted: false,
      dueDate: null,
      priority: 'LOW',
      asanaTaskGid: null,
      asanaPermalink: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTasks((prev) => [optimistic, ...prev]);
    setNewTask('');
    try {
      const res = await api.post('/tasks', { title: optimistic.title });
      setTasks((prev) => prev.map((t) => (t.id === optimistic.id ? res.data.data.task : t)));
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== optimistic.id));
      toast.error('Failed to add task');
    }
  };

  const addAsanaTask = async (asanaTask: AsanaSearchResult) => {
    setAdding(true);
    try {
      const res = await api.post('/asana/tasks/import', asanaTask);
      const task: Task = res.data.data.task;
      setTasks((prev) => {
        const exists = prev.some((item) => item.id === task.id || item.asanaTaskGid === task.asanaTaskGid);
        return exists ? prev.map((item) => (item.id === task.id || item.asanaTaskGid === task.asanaTaskGid ? task : item)) : [task, ...prev];
      });
      setNewTask('');
      setAsanaResults([]);
      toast.success('Asana task added');
    } catch {
      toast.error('Failed to add Asana task');
    } finally {
      setAdding(false);
    }
  };

  const toggleTask = async (task: Task) => {
    if (!task.isCompleted && task.asanaPermalink) {
      window.open(task.asanaPermalink, '_blank', 'noopener,noreferrer');
    }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t)));
    try {
      await api.put(`/tasks/${task.id}`, { isCompleted: !task.isCompleted });
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, isCompleted: task.isCompleted } : t)));
      toast.error(task.asanaTaskGid ? 'Failed to complete task in Asana' : 'Failed to update task');
    }
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.delete(`/tasks/${id}`);
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const incomplete = tasks.filter((t) => !t.isCompleted);
  const complete = tasks.filter((t) => t.isCompleted);

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <CheckSquare className="w-4 h-4 text-accent" />
        <h3 className="font-heading font-semibold text-text-primary text-sm">My Tasks</h3>
        <span className="ml-auto text-xs text-text-muted">{incomplete.length} remaining</span>
      </div>

      {asanaStatus && !asanaStatus.configured ? (
        <div className="text-xs text-text-muted bg-surface-elevated border border-border rounded-lg px-3 py-2 mb-3">
          Add Asana API keys on the server to enable task search.
        </div>
      ) : asanaStatus && !asanaStatus.connected ? (
        <button onClick={connectAsana} className="btn-outline text-sm mb-3">
          <Link2 className="w-4 h-4" /> Connect Asana
        </button>
      ) : (
        <div className="text-xs text-text-muted mb-2 flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          {asanaStatus?.connection?.workspaceName || 'Asana connected'}
        </div>
      )}

      <div className="relative mb-3">
        <form onSubmit={addTask} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="input text-sm h-8 pl-8"
              placeholder={asanaStatus?.connected ? 'Search Asana tasks...' : 'Add a task...'}
            />
          </div>
          <button type="submit" disabled={adding} className="btn-primary p-1.5 h-8 w-8">
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {asanaStatus?.connected && (asanaResults.length > 0 || searching) && (
          <div className="absolute left-0 right-10 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-card-hover overflow-hidden">
            {searching && (
              <div className="px-3 py-2 text-xs text-text-muted">Searching Asana...</div>
            )}
            {asanaResults.map((task) => (
              <button
                key={task.gid}
                type="button"
                onClick={() => addAsanaTask(task)}
                className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors"
              >
                <p className="text-sm text-text-primary truncate">{task.name}</p>
                <p className="text-xs text-text-muted">{task.dueOn ? `Due ${task.dueOn}` : 'Asana task'}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1">
          <AnimatePresence>
            {incomplete.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
            ))}
          </AnimatePresence>

          {complete.length > 0 && (
            <>
              <div className="text-xs text-text-muted pt-2 pb-1">Completed ({complete.length})</div>
              <AnimatePresence>
                {complete.slice(0, 3).map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                ))}
              </AnimatePresence>
            </>
          )}

          {tasks.length === 0 && (
            <div className="flex items-center justify-center text-text-muted text-sm py-4">
              No tasks yet — add one above!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }: {
  task: Task;
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-2 group px-1 py-0.5 rounded hover:bg-surface-hover transition-colors"
    >
      <button
        onClick={() => onToggle(task)}
        className={`flex-shrink-0 transition-colors ${task.isCompleted ? 'text-priority-low' : 'text-text-muted hover:text-accent'}`}
      >
        {task.isCompleted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
      </button>
      <span className={`flex-1 text-sm ${task.isCompleted ? 'line-through text-text-muted' : 'text-text-secondary'}`}>
        {task.title}
      </span>
      {task.asanaPermalink && (
        <a
          href={task.asanaPermalink}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-all"
          title="Open in Asana"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-priority-urgent transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
