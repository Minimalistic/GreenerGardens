import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { SubPlot } from '@gardenvault/shared';

export const PX_PER_FT = 40;

const PLOT_COLORS: Record<string, string> = {
  raised_bed: '#4A7C59',
  in_ground: '#8B6914',
  container: '#D4956A',
  greenhouse: '#87CEEB',
  vertical: '#3D5A3E',
  hydroponic: '#6CB4EE',
  other: '#999',
};

interface ContextMenuEvent {
  x: number;
  y: number;
  plotId: string | null;
}

interface Props {
  plots: any[];
  selectedPlotId: string | null;
  onSelectPlot: (id: string | null) => void;
  onPlotDragEnd: (id: string, geometry: any) => void;
  onContextMenu?: (e: ContextMenuEvent) => void;
  subPlotsByPlot?: Map<string, SubPlot[]>;
}

function snapTo(value: number, grid: number) {
  return Math.round(value / grid) * grid;
}

export function GardenCanvas({
  plots,
  selectedPlotId,
  onSelectPlot,
  onPlotDragEnd,
  onContextMenu,
  subPlotsByPlot,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const plotRefs = useRef<Map<string, Konva.Group>>(new Map());
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [snapEnabled, setSnapEnabled] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height: Math.max(height, 400) });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Attach transformer to selected plot
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;

    if (selectedPlotId) {
      const node = plotRefs.current.get(selectedPlotId);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedPlotId, plots]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      onSelectPlot(null);
    }
  }, [onSelectPlot]);

  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (!snapEnabled) return;
    const node = e.target;
    node.x(snapTo(node.x(), PX_PER_FT));
    node.y(snapTo(node.y(), PX_PER_FT));
  }, [snapEnabled]);

  const handleTransformEnd = useCallback((plotId: string, geometry: any) => {
    const node = plotRefs.current.get(plotId);
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    let newWidth = Math.max(PX_PER_FT, Math.round(geometry.width * scaleX));
    let newHeight = Math.max(PX_PER_FT, Math.round(geometry.height * scaleY));
    let newX = node.x();
    let newY = node.y();

    if (snapEnabled) {
      newWidth = Math.max(PX_PER_FT, snapTo(newWidth, PX_PER_FT));
      newHeight = Math.max(PX_PER_FT, snapTo(newHeight, PX_PER_FT));
      newX = snapTo(newX, PX_PER_FT);
      newY = snapTo(newY, PX_PER_FT);
    }

    onPlotDragEnd(plotId, {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      rotation: node.rotation(),
    });
  }, [onPlotDragEnd, snapEnabled]);

  // Right-click handler
  const handleContextMenu = useCallback((e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    if (!onContextMenu) return;

    const stage = stageRef.current;
    if (!stage) return;

    // Determine if we clicked on a plot
    const target = e.target;
    let plotId: string | null = null;

    // Walk up the node tree to find the plot group
    let node: Konva.Node | null = target;
    while (node && node !== stage) {
      for (const [id, groupNode] of plotRefs.current.entries()) {
        if (node === groupNode) {
          plotId = id;
          break;
        }
      }
      if (plotId) break;
      node = node.parent;
    }

    if (plotId) {
      onSelectPlot(plotId);
    }

    onContextMenu({
      x: e.evt.clientX,
      y: e.evt.clientY,
      plotId,
    });
  }, [onContextMenu, onSelectPlot]);

  // Hover cursor
  const handleMouseEnterPlot = useCallback(() => {
    const stage = stageRef.current;
    if (stage) {
      const container = stage.container();
      container.style.cursor = 'pointer';
    }
  }, []);

  const handleMouseLeavePlot = useCallback(() => {
    const stage = stageRef.current;
    if (stage) {
      const container = stage.container();
      container.style.cursor = 'default';
    }
  }, []);

  const colCount = Math.ceil(size.width / PX_PER_FT);
  const rowCount = Math.ceil(size.height / PX_PER_FT);

  return (
    <div ref={containerRef} className="w-full h-full rounded-lg border bg-card overflow-hidden relative">
      {/* Snap toggle */}
      <button
        onClick={() => setSnapEnabled(s => !s)}
        className={`absolute top-2 right-2 z-10 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
          snapEnabled
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background text-muted-foreground border-border hover:bg-muted'
        }`}
      >
        Snap {snapEnabled ? 'ON' : 'OFF'}
      </button>

      {/* Scale indicator */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <div className="border-t border-muted-foreground" style={{ width: PX_PER_FT }} />
        <span>1 ft</span>
      </div>

      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onClick={handleStageClick}
        onContextMenu={handleContextMenu}
      >
        <Layer listening={false}>
          {/* Minor grid lines (every 1 ft) */}
          {Array.from({ length: colCount + 1 }).map((_, i) => (
            <Rect
              key={`gv-${i}`}
              x={i * PX_PER_FT}
              y={0}
              width={1}
              height={size.height}
              fill={i % 5 === 0 ? '#c5c2b5' : '#e5e2d9'}
              opacity={i % 5 === 0 ? 0.7 : 0.4}
            />
          ))}
          {Array.from({ length: rowCount + 1 }).map((_, i) => (
            <Rect
              key={`gh-${i}`}
              x={0}
              y={i * PX_PER_FT}
              width={size.width}
              height={1}
              fill={i % 5 === 0 ? '#c5c2b5' : '#e5e2d9'}
              opacity={i % 5 === 0 ? 0.7 : 0.4}
            />
          ))}

          {/* Foot labels along top edge every 5 ft */}
          {Array.from({ length: Math.floor(colCount / 5) + 1 }).map((_, i) => {
            const ft = i * 5;
            if (ft === 0) return null;
            return (
              <Text
                key={`lx-${ft}`}
                x={ft * PX_PER_FT + 2}
                y={2}
                text={`${ft}'`}
                fontSize={9}
                fill="#999"
              />
            );
          })}
          {Array.from({ length: Math.floor(rowCount / 5) + 1 }).map((_, i) => {
            const ft = i * 5;
            if (ft === 0) return null;
            return (
              <Text
                key={`ly-${ft}`}
                x={2}
                y={ft * PX_PER_FT + 2}
                text={`${ft}'`}
                fontSize={9}
                fill="#999"
              />
            );
          })}
        </Layer>

        <Layer>
          {plots.map((plot: any) => {
            const dims = plot.dimensions;
            const defaultW = dims ? dims.width_ft * PX_PER_FT : 120;
            const defaultH = dims ? dims.length_ft * PX_PER_FT : 80;
            const g = plot.geometry ?? { x: PX_PER_FT, y: PX_PER_FT, width: defaultW, height: defaultH, rotation: 0 };
            const isSelected = plot.id === selectedPlotId;
            const color = PLOT_COLORS[plot.plot_type] ?? PLOT_COLORS.other;
            const widthFt = (g.width / PX_PER_FT).toFixed(1).replace(/\.0$/, '');
            const heightFt = (g.height / PX_PER_FT).toFixed(1).replace(/\.0$/, '');

            // Sub-plot data
            const subPlots = subPlotsByPlot?.get(plot.id);
            const hasSubPlots = subPlots && subPlots.length > 0;

            return (
              <Group
                key={plot.id}
                ref={(node: Konva.Group) => {
                  if (node) plotRefs.current.set(plot.id, node);
                  else plotRefs.current.delete(plot.id);
                }}
                x={g.x}
                y={g.y}
                rotation={g.rotation}
                draggable
                onClick={() => onSelectPlot(plot.id)}
                onTap={() => onSelectPlot(plot.id)}
                onDragMove={handleDragMove}
                onDragEnd={(e) => {
                  const x = snapEnabled ? snapTo(e.target.x(), PX_PER_FT) : e.target.x();
                  const y = snapEnabled ? snapTo(e.target.y(), PX_PER_FT) : e.target.y();
                  onPlotDragEnd(plot.id, { ...g, x, y });
                }}
                onTransformEnd={() => handleTransformEnd(plot.id, g)}
                onMouseEnter={handleMouseEnterPlot}
                onMouseLeave={handleMouseLeavePlot}
              >
                {/* Plot background — outline only when sub-plots exist, solid fill otherwise */}
                <Rect
                  width={g.width}
                  height={g.height}
                  fill={hasSubPlots ? undefined : color}
                  opacity={hasSubPlots ? 1 : 0.75}
                  cornerRadius={4}
                  stroke={isSelected ? '#F4D03F' : (hasSubPlots ? color : '#333')}
                  strokeWidth={isSelected ? 3 : (hasSubPlots ? 2 : 1)}
                  shadowColor="rgba(0,0,0,0.15)"
                  shadowBlur={isSelected ? 8 : 2}
                />

                {/* Sub-plot shapes within the plot */}
                {subPlots?.map(sp => {
                  const spg = sp.geometry;
                  if (!spg) return null;
                  const hasPlant = !!sp.plant_instance_id;
                  return (
                    <Rect
                      key={sp.id}
                      x={spg.x}
                      y={spg.y}
                      width={spg.width}
                      height={spg.height}
                      fill={hasPlant ? '#4ade80' : color}
                      opacity={hasPlant ? 0.8 : 0.55}
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth={1.5}
                      cornerRadius={2}
                      listening={false}
                    />
                  );
                })}

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
                  listening={false}
                />
                <Text
                  text={`${widthFt}' x ${heightFt}'`}
                  x={6}
                  y={g.height - 18}
                  fontSize={10}
                  fill="rgba(255,255,255,0.8)"
                  width={g.width - 12}
                  ellipsis
                  wrap="none"
                  listening={false}
                />
              </Group>
            );
          })}

          <Transformer
            ref={transformerRef}
            rotateEnabled={true}
            enabledAnchors={[
              'top-left', 'top-right', 'bottom-left', 'bottom-right',
              'middle-left', 'middle-right', 'top-center', 'bottom-center',
            ]}
            borderStroke="#F4D03F"
            borderStrokeWidth={2}
            anchorStroke="#F4D03F"
            anchorFill="#fff"
            anchorSize={8}
            boundBoxFunc={(_oldBox, newBox) => {
              if (newBox.width < PX_PER_FT || newBox.height < PX_PER_FT) {
                return _oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
}
