import { useState } from 'react';
import { HiOutlineCheck, HiOutlineSparkles, HiOutlineX } from 'react-icons/hi';
import { DEFAULT_AVATARS } from '../constants/avatars';
import { Modal } from './ui';

export default function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatar,
  onSelect,
  displayName = 'Developer',
  title = 'آواتار خود را انتخاب کن 🎨',
  subtitle = 'یک آواتار خفن و منحصر‌به‌فرد برای پروفایل برنامه‌نویسی‌ات انتخاب کن!',
}) {
  const [selectedPath, setSelectedPath] = useState(currentAvatar || DEFAULT_AVATARS[0].path);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'همه' },
    { id: 'Cyber', label: 'سایبرپانک' },
    { id: 'Fantasy', label: 'فانتزی' },
    { id: 'Animals', label: 'حیوانات' },
    { id: 'Sci-Fi', label: 'کیهانی' },
  ];

  const filteredAvatars = selectedCategory === 'all'
    ? DEFAULT_AVATARS
    : DEFAULT_AVATARS.filter(a => a.category === selectedCategory);

  const handleRandom = () => {
    const random = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
    setSelectedPath(random.path);
  };

  const handleConfirm = () => {
    onSelect(selectedPath);
    onClose();
  };

  const currentObj = DEFAULT_AVATARS.find(a => a.path === selectedPath) || DEFAULT_AVATARS[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-5" dir="rtl">
        {subtitle && (
          <p className="text-xs text-text-muted leading-relaxed text-right">
            {subtitle}
          </p>
        )}

        {/* Live Preview Box */}
        <div className="flex items-center gap-4 rounded-2xl bg-surface-lighter/60 border border-border/80 p-3.5">
          <div className="relative">
            <img
              src={selectedPath}
              alt={currentObj.nameFa}
              className="h-16 w-16 rounded-full border-2 border-primary object-cover shadow-lg shadow-primary/20 bg-surface"
            />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 border-2 border-surface">
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
          </div>
          <div className="min-w-0 flex-1 text-right">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-base text-text truncate">{displayName}</h4>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                {currentObj.nameFa}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              آواتار انتخابی شما در لیگ، جامعه و پروفایل نمایش داده می‌شود.
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary text-white shadow-sm shadow-primary/30'
                  : 'bg-surface-lighter text-text-muted hover:text-text hover:bg-surface-light border border-border/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Avatars Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-72 overflow-y-auto p-1">
          {filteredAvatars.map(av => {
            const isSelected = selectedPath === av.path;
            return (
              <button
                key={av.id}
                type="button"
                onClick={() => setSelectedPath(av.path)}
                className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${
                  isSelected
                    ? 'bg-primary/15 border-2 border-primary ring-2 ring-primary/20 shadow-md scale-105'
                    : 'bg-surface-lighter/50 hover:bg-surface-lighter border border-border/60 hover:scale-102'
                }`}
              >
                <div className="relative">
                  <img
                    src={av.path}
                    alt={av.nameFa}
                    className="h-12 w-12 rounded-full object-cover bg-surface"
                  />
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-white shadow">
                      <HiOutlineCheck size={11} />
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-text-muted group-hover:text-text truncate w-full text-center">
                  {av.nameFa}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
          <button
            type="button"
            onClick={handleRandom}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface-lighter text-xs font-medium text-text hover:bg-surface-light transition-all"
          >
            <HiOutlineSparkles className="text-amber-400" size={15} />
            <span>شانسی 🎲</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-text hover:bg-surface-lighter transition-colors"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all active:scale-95"
            >
              <HiOutlineCheck size={15} />
              <span>انتخاب این آواتار ✨</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
