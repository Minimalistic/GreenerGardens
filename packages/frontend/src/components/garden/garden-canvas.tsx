import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Transformer } from 'react-konva';
import type Konva from 'konva';

const PLOT_COLORS: Record<string, string> = {
  raised_bed: '#4A7C59',
  in_ground: '#8B6914',
  container: '#D4956A',
  greenhouse: '#87CEEB',
  vertical: '#3D5A3E',
  hydroponic: '#6CB4EE',
  other: '#999',
};

interface Props {
  plots: any[];
  selectedPlotId: string | null;
  onSelectPlot: (id: string | null) => void;
  onPlotDragEnd: (id: string, geometry: any) => void;
}

export function GardenCanvas({ plots, selectedPlotId, onSelectPlot, onPlotDragEnd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height: Math.max(height, 400) });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      onSelectPlot(null);
    }
  }, [onSelectPlot]);

  return (
    <div ref={containerRef} className="w-full h-full rounded-lg border bg-card overflow-hidden">
      <Stage width={size.width} height={size.height} onClick={handleStageClick}>
        <Layer>
          {/* Grid background */}
          {Array.from({ length: Math.ceil(size.width / 40) }).map((_, i) => (
            <Rect
              key={`gv-${i}`}
              x={i * 40}
              y={0}
              width={1}
              height={size.height}
              fill="#e5e2d9"
              opacity={0.5}
            />
          ))}
          {Array.from({ length: Math.ceil(size.height / 40) }).map((_, i) => (
            <Rect
              key={`gh-${i}`}
              x={0}
              y={i * 40}
              width={size.width}
              height={1}
              fill="#e5e2d9"
              opacity={0.5}
            />
          ))}

          {plots.map((plot: any) => {
            const g = plot.geometry ?? { x: 50, y: 50, width: 120, height: 80, rotation: 0 };
            const isSelected = plot.id === selectedPlotId;
            const color = PLOT_COLORS[plot.plot_type] ?? PLOT_COLORS.other;

            return (
              <Group
                key={plot.id}
                x={g.x}
                y={g.y}
                rotation={g.rotation}
                draggable
                onClick={() => onSelectPlot(plot.id)}
                onTap={() => onSelectPlot(plot.id)}
                onDragEnd={(e) => {
                  onPlotDragEnd(plot.id, {
                    ...g,
                    x: e.target.x(),
                    y: e.target.y(),
                  });
                }}
              >
                <Rect
                  width={g.width}
                  height={g.height}
                  fill={color}
                  opacity={0.75}
                  cornerRadius={4}
                  stroke={isSelected ? '#F4D03F' : '#333'}
                  strokeWidth={isSelected ? 3 : 1}
                  shadowColor="rgba(0,0,0,0.15)"
                  shadowBlur={isSelected ? 8 : 2}
                />
                <Text
                  text={plot.name}
                  x={6}
                  y={6}
                  fontSize={12}
                  fontStyle="bold"
                  fill="white"
                  width={g.width - 12}
                  ellipsis
                  wrap="none"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
