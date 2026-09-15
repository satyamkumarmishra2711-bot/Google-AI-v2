import React, { useState, useCallback, useEffect, useRef } from 'react';

interface UsePanelResizeOptions {
  storageKey?: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  reverse?: boolean; // If true, dragging right decreases width (for right-docked panels)
}

export function usePanelResize({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  reverse = false,
}: UsePanelResizeOptions) {
  const [width, setWidth] = useState<number>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          return parsed;
        }
      }
    }
    return defaultWidth;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startWidth: width,
      };
      setIsDragging(true);
    },
    [width]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const change = reverse ? -deltaX : deltaX;
      const newWidth = Math.min(
        Math.max(dragRef.current.startWidth + change, minWidth),
        maxWidth
      );
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minWidth, maxWidth, reverse]);

  // Persist to storage when width changes and dragging finishes
  useEffect(() => {
    if (!isDragging && storageKey) {
      localStorage.setItem(storageKey, width.toString());
    }
  }, [width, isDragging, storageKey]);

  const resetWidth = useCallback(() => {
    setWidth(defaultWidth);
    if (storageKey) {
      localStorage.setItem(storageKey, defaultWidth.toString());
    }
  }, [defaultWidth, storageKey]);

  return {
    width,
    setWidth,
    isDragging,
    startResizing,
    resetWidth,
  };
}
