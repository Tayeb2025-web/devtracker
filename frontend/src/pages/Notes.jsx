import { useCallback, useEffect, useState } from 'react';
import { noteApi } from '../services/api';
import { formatLocalDate } from '../constants';
import { useToast } from '../contexts/ToastContextStore';
import { AfghanDateInput, Button, Card, LoadingSpinner, Select, Textarea } from '../components/ui';
import { HiOutlineSparkles, HiOutlinePencilAlt } from 'react-icons/hi';

const SCORE_OPTIONS = [
  { value: '', label: 'Not rated' },
  ...Array.from({ length: 10 }, (_, index) => ({
    value: String(index + 1),
    label: `${index + 1} / 10 Productivity`,
  })),
];

export default function Notes() {
  const toast = useToast();
  const [date, setDate] = useState(formatLocalDate());
  const [content, setContent] = useState('');
  const [score, setScore] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadNote = useCallback(async (selectedDate) => {
    setLoading(true);
    try {
      const res = await noteApi.getByDate(selectedDate);
      setContent(res.data?.content || '');
      setScore(res.data?.productivity_score ? String(res.data.productivity_score) : '');
    } catch (error) {
      toast.error(error.message);
      setContent('');
      setScore('');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadNote(date);
  }, [date, loadNote]);

  const save = async () => {
    setSaving(true);
    try {
      await noteApi.save(date, {
        content,
        productivity_score: score ? Number(score) : null,
      });
      toast.success('Daily note saved');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-7">
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <HiOutlineSparkles size={16} />
          <span>Journal</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Daily Notes</h1>
        <p className="text-text-muted text-xs sm:text-sm mt-1">Capture what you learned, key breakthroughs, and how your coding day went</p>
      </div>

      <Card className="p-6 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 pb-6 border-b border-border/60">
          <AfghanDateInput label="Date" value={date} max={formatLocalDate()} onChange={setDate} />
          <Select label="Productivity Rating" options={SCORE_OPTIONS} value={score} onChange={event => setScore(event.target.value)} />
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="space-y-5">
            <div className="relative">
              <Textarea
                label="Daily Reflections & Notes"
                rows={13}
                value={content}
                onChange={event => setContent(event.target.value)}
                placeholder="What did you learn today? What challenges did you solve? What will you focus on tomorrow?"
                className="font-sans leading-relaxed text-sm"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="px-7 py-3">
                <HiOutlinePencilAlt size={18} />
                {saving ? 'Saving Note…' : 'Save Note'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
