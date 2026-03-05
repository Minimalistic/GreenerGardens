import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface Section {
  id: string;
  label: string;
}

interface SectionNavProps {
  sections: Section[];
}

export function SectionNav({ sections }: SectionNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');
  const [isStuck, setIsStuck] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isClickScrolling = useRef(false);

  // Detect when nav becomes sticky using a sentinel element
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const scrollParent = sentinel.closest('main') ?? window;
    const root = scrollParent instanceof HTMLElement ? scrollParent : null;

    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { root, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Track which section is closest to the top of the scroll area
  useEffect(() => {
    const scrollParent = navRef.current?.closest('main') as HTMLElement | null;
    if (!scrollParent) return;

    const onScroll = () => {
      if (isClickScrolling.current) return;

      const offset = 80; // account for sticky nav height + some padding
      let bestId = sections[0]?.id ?? '';

      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - scrollParent.getBoundingClientRect().top;
        if (top <= offset) {
          bestId = section.id;
        }
      }

      setActiveId(bestId);
    };

    scrollParent.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // set initial state
    return () => scrollParent.removeEventListener('scroll', onScroll);
  }, [sections]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    setActiveId(id);
    isClickScrolling.current = true;

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Re-enable observer tracking after scroll settles
    setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  }, []);

  return (
    <>
      {/* Sentinel: sits right above the nav in normal flow */}
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden />
      <div
        ref={navRef}
        className={cn(
          'sticky top-0 z-30 -mx-4 px-4 transition-shadow duration-200',
          isStuck
            ? 'bg-background/95 backdrop-blur-sm shadow-md py-1'
            : 'py-0'
        )}
      >
        <div
          className={cn(
            'inline-flex h-10 items-center rounded-md bg-muted p-1 text-muted-foreground w-full overflow-x-auto justify-start sm:justify-center',
          )}
        >
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollTo(section.id)}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                activeId === section.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'hover:bg-background/50'
              )}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
