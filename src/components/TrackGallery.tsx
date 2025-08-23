import React, { useMemo, useRef } from 'react';

export interface TrackGalleryItem {
  pid: number;
  frame: number;
  bbox: number[];
  duration_s: number;
  thumbnail_url: string;
}

interface TrackGalleryProps {
  items: TrackGalleryItem[];
  excludedIds: number[];
  onToggleExclude: (pid: number) => void;
  title?: string;
}

const TrackGallery: React.FC<TrackGalleryProps> = ({ items, excludedIds, onToggleExclude, title = 'Pantau Pengunjungmu' }) => {
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.duration_s - a.duration_s);
  }, [items]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = dir === 'left' ? -Math.max(320, el.clientWidth * 0.8) : Math.max(320, el.clientWidth * 0.8);
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {excludedIds.length > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
              🚫 {excludedIds.length} excluded
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => scrollBy('left')} className="px-3 py-1 rounded-lg bg-white border" style={{ borderColor:'#e6dfd2' }}>{'◀'}</button>
          <button onClick={() => scrollBy('right')} className="px-3 py-1 rounded-lg bg-white border" style={{ borderColor:'#e6dfd2' }}>{'▶'}</button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="w-full overflow-x-auto"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        <div className="flex gap-4 min-w-full" style={{ paddingBottom: 4 }}>
          {sorted.map((t) => (
            <div key={t.pid} className="flex-shrink-0 w-[200px] border rounded-xl p-2 bg-white" style={{ borderColor:'#e6dfd2', scrollSnapAlign:'start' }}>
              <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img src={t.thumbnail_url} alt={`PID ${t.pid}`} className="w-full h-full object-contain" />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">ID {t.pid}</span>
                <span className="text-gray-600">{t.duration_s.toFixed(1)}s</span>
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={excludedIds.includes(t.pid)} onChange={() => onToggleExclude(t.pid)} />
                <span className="text-gray-700">Exclude</span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrackGallery;


