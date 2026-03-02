import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { SubPlot } from '@gardenvault/shared';

export const PX_PER_FT = 40;

const MIN_SCALE = 0.1;
const MAX_SCALE = 3;
const ZOOM_SPEED = 1.08;
const FIT_PADDING = 40; // px padding when fitting to content

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
  onPlotDoubleClick?: (id: string) => void;
  subPlotsByPlot?: Map<string, SubPlot[]>;
}

function snapTo(value: number, grid: number) {
  return Math.round(value / grid) * grid;
}

function clampScale(s: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

export function GardenCanvas({
  plots,
  selectedPlotId,
  onSelectPlot,
  onPlotDragEnd,
  onContextMenu,
  onPlotDoubleClick,
  subPlotsByPlot,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const plotRefs = useRef<Map<string, Konva.Group>>(new Map());
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const hasFitted = useRef(false);

  // Compute bounding box of all plots
  const getContentBounds = useCallback(() => {
    if (plots.length === 0) return { x: 0, y: 0, width: 800, height: 600 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const plot of plots) {
      const dims = plot.dimensions;
      const defaultW = dims ? dims.width_ft * PX_PER_FT : 120;
      const defaultH = dims ? dims.length_ft * PX_PER_FT : 80;
      const g = plot.geometry ?? { x: PX_PER_FT, y: PX_PER_FT, width: defaultW, height: defaultH };
      minX = Math.min(minX, g.x);
      minY = Math.min(minY, g.y);
      maxX = Math.max(maxX, g.x + g.width);
      maxY = Math.max(maxY, g.y + g.height);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [plots]);

  const fitToContent = useCallback(() => {
    const bounds = getContentBounds();
    const scaleX = (size.width - FIT_PADDING * 2) / bounds.width;
    const scaleY = (size.height - FIT_PADDING * 2) / bounds.height;
    const newScale = clampScale(Math.min(scaleX, scaleY, 1.5));
    const newX = (size.width - bounds.width * newScale) / 2 - bounds.x * newScale;
    const newY = (size.height - bounds.height * newScale) / 2 - bounds.y * newScale;
    setStageScale(newScale);
    setStagePos({ x: newX, y: newY });
  }, [getContentBounds, size]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height: Math.max(height, 400) });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fit to content on first render when we have plots and a valid size
  useEffect(() => {
    if (hasFitted.current || plots.length === 0 || size.width <= 1) return;
    hasFitted.current = true;
    fitToContent();
  }, [plots, size, fitToContent]);

  // Wheel zoom (centered on pointer)
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = clampScale(direction > 0 ? oldScale * ZOOM_SPEED : oldScale / ZOOM_SPEED);

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, []);

  // Pinch-to-zoom
  const lastPinchDist = useRef<number | null>(null);
  const lastPinchCenter = useRef<{ x: number; y: number } | null>(null);

  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touch = e.evt.touches;
    if (touch.length !== 2) {
      lastPinchDist.current = null;
      lastPinchCenter.current = null;
      return;
    }
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const p1 = { x: touch[0].clientX, y: touch[0].clientY };
    const p2 = { x: touch[1].clientX, y: touch[1].clientY };
    const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    // Get center relative to stage container
    const rect = stage.container().getBoundingClientRect();
    const stageCenter = { x: center.x - rect.left, y: center.y - rect.top };

    if (lastPinchDist.current != null && lastPinchCenter.current != null) {
      const oldScale = stage.scaleX();
      const scaleFactor = dist / lastPinchDist.current;
      const newScale = clampScale(oldScale * scaleFactor);

      const mousePointTo = {
        x: (stageCenter.x - stage.x()) / oldScale,
        y: (stageCenter.y - stage.y()) / oldScale,
      };

      // Also apply panning from center movement
      const dx = stageCenter.x - lastPinchCenter.current.x;
      const dy = stageCenter.y - lastPinchCenter.current.y;

      setStageScale(newScale);
      setStagePos({
        x: stageCenter.x - mousePointTo.x * newScale + dx,
        y: stageCenter.y - mousePointTo.y * newScale + dy,
      });
    }

    lastPinchDist.current = dist;
    lastPinchCenter.current = stageCenter;
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastPinchDist.current = null;
    lastPinchCenter.current = null;
  }, []);

  // Prevent default touch behavior on the canvas container to avoid browser zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };
    el.addEventListener('touchmove', prevent, { passive: false });
    return () => el.removeEventListener('touchmove', prevent);
  }, []);

  // Stage drag (pan) — only when dragging the stage background itself
  const handleDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    // Only allow stage itself to be dragged (for panning)
    if (e.target !== e.target.getStage()) return;
  }, []);

  const handleStageDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage()) {
      setStagePos({ x: e.target.x(), y: e.target.y() });
    }
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

  // Compute the minimum width/height for a plot based on its sub-plots
  const getMinPlotSize = useCallback((plotId: string) => {
    const subs = subPlotsByPlot?.get(plotId);
    if (!subs || subs.length === 0) return { minW: PX_PER_FT, minH: PX_PER_FT };
    let maxRight = 0;
    let maxBottom = 0;
    for (const sp of subs) {
      const g = sp.geometry;
      if (!g) continue;
      maxRight = Math.max(maxRight, g.x + g.width);
      maxBottom = Math.max(maxBottom, g.y + g.height);
    }
    return {
      minW: Math.max(PX_PER_FT, snapTo(Math.ceil(maxRight), PX_PER_FT)),
      minH: Math.max(PX_PER_FT, snapTo(Math.ceil(maxBottom), PX_PER_FT)),
    };
  }, [subPlotsByPlot]);

  const handleTransformEnd = useCallback((plotId: string, geometry: any) => {
    const node = plotRefs.current.get(plotId);
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const { minW, minH } = getMinPlotSize(plotId);

    let newWidth = Math.max(minW, Math.round(geometry.width * scaleX));
    let newHeight = Math.max(minH, Math.round(geometry.height * scaleY));
    let newX = node.x();
    let newY = node.y();

    if (snapEnabled) {
      newWidth = Math.max(minW, snapTo(newWidth, PX_PER_FT));
      newHeight = Math.max(minH, snapTo(newHeight, PX_PER_FT));
      newX = snapTo(newX, PX_PER_FT);
      newY = snapTo(newY, PX_PER_FT);
    }

    onPlotDragEnd(plotId, {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      rotation: 0,
    });
  }, [onPlotDragEnd, snapEnabled, getMinPlotSize]);

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

  // Compute visible grid extent based on viewport
  const visibleTopLeft = {
    x: -stagePos.x / stageScale,
    y: -stagePos.y / stageScale,
  };
  const visibleBottomRight = {
    x: (size.width - stagePos.x) / stageScale,
    y: (size.height - stagePos.y) / stageScale,
  };
  const gridStartCol = Math.floor(visibleTopLeft.x / PX_PER_FT);
  const gridEndCol = Math.ceil(visibleBottomRight.x / PX_PER_FT);
  const gridStartRow = Math.floor(visibleTopLeft.y / PX_PER_FT);
  const gridEndRow = Math.ceil(visibleBottomRight.y / PX_PER_FT);

  const zoomPercent = Math.round(stageScale * 100);

  return (
    <div ref={containerRef} className="w-full h-full rounded-lg border bg-card overflow-hidden relative touch-none">
      {/* Top toolbar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
        <button
          onClick={fitToContent}
          className="px-2 py-1 text-xs font-medium rounded border bg-background text-muted-foreground border-border hover:bg-muted transition-colors"
          title="Fit to content"
        >
          Fit
        </button>
        <button
          onClick={() => setSnapEnabled(s => !s)}
          className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
            snapEnabled
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:bg-muted'
          }`}
        >
          Snap {snapEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Bottom indicators */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="border-t border-muted-foreground" style={{ width: PX_PER_FT * stageScale }} />
          <span>1 ft</span>
        </div>
        <span>{zoomPercent}%</span>
      </div>

      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable
        onClick={handleStageClick}
        onTap={handleStageClick}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDragStart={handleDragStart}
        onDragEnd={handleStageDragEnd}
      >
        <Layer listening={false}>
          {/* Grid lines — computed from visible viewport */}
          {Array.from({ length: gridEndCol - gridStartCol + 1 }).map((_, i) => {
            const col = gridStartCol + i;
            return (
              <Rect
                key={`gv-${col}`}
                x={col * PX_PER_FT}
                y={visibleTopLeft.y}
                width={1 / stageScale}
                height={visibleBottomRight.y - visibleTopLeft.y}
                fill={col % 5 === 0 ? '#c5c2b5' : '#e5e2d9'}
                opacity={col % 5 === 0 ? 0.7 : 0.4}
              />
            );
          })}
          {Array.from({ length: gridEndRow - gridStartRow + 1 }).map((_, i) => {
            const row = gridStartRow + i;
            return (
              <Rect
                key={`gh-${row}`}
                x={visibleTopLeft.x}
                y={row * PX_PER_FT}
                width={visibleBottomRight.x - visibleTopLeft.x}
                height={1 / stageScale}
                fill={row % 5 === 0 ? '#c5c2b5' : '#e5e2d9'}
                opacity={row % 5 === 0 ? 0.7 : 0.4}
              />
            );
          })}

          {/* Foot labels along visible area every 5 ft */}
          {Array.from({ length: gridEndCol - gridStartCol + 1 }).map((_, i) => {
            const col = gridStartCol + i;
            if (col <= 0 || col % 5 !== 0) return null;
            return (
              <Text
                key={`lx-${col}`}
                x={col * PX_PER_FT + 2 / stageScale}
                y={Math.max(visibleTopLeft.y + 2 / stageScale, 2 / stageScale)}
                text={`${col}'`}
                fontSize={9 / stageScale}
                fill="#999"
              />
            );
          })}
          {Array.from({ length: gridEndRow - gridStartRow + 1 }).map((_, i) => {
            const row = gridStartRow + i;
            if (row <= 0 || row % 5 !== 0) return null;
            return (
              <Text
                key={`ly-${row}`}
                x={Math.max(visibleTopLeft.x + 2 / stageScale, 2 / stageScale)}
                y={row * PX_PER_FT + 2 / stageScale}
                text={`${row}'`}
                fontSize={9 / stageScale}
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
                rotation={0}
                draggable
                onClick={() => onSelectPlot(plot.id)}
                onTap={() => onSelectPlot(plot.id)}
                onDblClick={() => onPlotDoubleClick?.(plot.id)}
                onDblTap={() => onPlotDoubleClick?.(plot.id)}
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
            rotateEnabled={false}
            keepRatio={false}
            enabledAnchors={[
              'top-left', 'top-right', 'bottom-left', 'bottom-right',
              'middle-left', 'middle-right', 'top-center', 'bottom-center',
            ]}
            borderStroke="#F4D03F"
            borderStrokeWidth={2}
            anchorStroke="#F4D03F"
            anchorFill="#fff"
            anchorSize={14}
            boundBoxFunc={(_oldBox, newBox) => {
              // Enforce minimum 1ft and sub-plot extent
              const { minW, minH } = selectedPlotId
                ? getMinPlotSize(selectedPlotId)
                : { minW: PX_PER_FT, minH: PX_PER_FT };
              if (newBox.width < minW || newBox.height < minH) {
                return _oldBox;
              }
              if (snapEnabled) {
                return {
                  ...newBox,
                  x: snapTo(newBox.x, PX_PER_FT),
                  y: snapTo(newBox.y, PX_PER_FT),
                  width: Math.max(minW, snapTo(newBox.width, PX_PER_FT)),
                  height: Math.max(minH, snapTo(newBox.height, PX_PER_FT)),
                };
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
}
