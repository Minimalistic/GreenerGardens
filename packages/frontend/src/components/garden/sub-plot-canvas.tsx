import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Transformer, Line } from 'react-konva';
import type Konva from 'konva';
import { PX_PER_FT } from './garden-canvas';
import { PLOT_COLORS, snapTo, clampScale } from '@/lib/canvas-utils';
import type { SubPlotWithPlant } from '@/hooks/use-sub-plots';

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const ZOOM_SPEED = 1.08;
const FIT_PADDING = 20;
const BUTTON_ZOOM = 1.3;

interface Props {
  widthFt: number;
  lengthFt: number;
  subPlots: SubPlotWithPlant[];
  selectedSubPlotId: string | null;
  onSelectSubPlot: (id: string | null) => void;
  onSubPlotDragEnd: (id: string, geometry: { x: number; y: number; width: number; height: number; rotation: number }) => void;
  onSubPlotDoubleClick: (id: string) => void;
}

export function SubPlotCanvas({
  widthFt,
  lengthFt,
  subPlots,
  selectedSubPlotId,
  onSelectSubPlot,
  onSubPlotDragEnd,
  onSubPlotDoubleClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const subPlotRefs = useRef<Map<string, Konva.Group>>(new Map());
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [snapEnabled, setSnapEnabled] = useState(true);

  // Canvas dimensions in pixels based on plot dimensions
  const canvasWidth = widthFt * PX_PER_FT;
  const canvasHeight = lengthFt * PX_PER_FT;

  // Base scale = fit both dimensions within container with padding
  const baseScale = containerWidth > FIT_PADDING * 2 && containerHeight > FIT_PADDING * 2
    ? Math.min(
        (containerWidth - FIT_PADDING * 2) / canvasWidth,
        (containerHeight - FIT_PADDING * 2) / canvasHeight,
      )
    : 1;
  const [userScale, setUserScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const scale = baseScale * userScale;
  const displayWidth = containerWidth || 800;
  const displayHeight = containerHeight || 500;

  // Fit view: center the plot in the viewport at 1x zoom
  const fitView = useCallback(() => {
    setUserScale(1);
    setStagePos({
      x: (containerWidth - canvasWidth * baseScale) / 2,
      y: (containerHeight - canvasHeight * baseScale) / 2,
    });
  }, [containerWidth, containerHeight, canvasWidth, canvasHeight, baseScale]);

  // Zoom by factor, centered on viewport center
  const zoomByFactor = useCallback((factor: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = scale;
    const newUserScale = clampScale(MIN_SCALE, MAX_SCALE, (oldScale * factor) / baseScale);
    const newScale = baseScale * newUserScale;
    const cx = containerWidth / 2;
    const cy = containerHeight / 2;
    const pointTo = {
      x: (cx - stage.x()) / oldScale,
      y: (cy - stage.y()) / oldScale,
    };
    setUserScale(newUserScale);
    setStagePos({
      x: cx - pointTo.x * newScale,
      y: cy - pointTo.y * newScale,
    });
  }, [scale, baseScale, containerWidth, containerHeight]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerWidth(width);
      setContainerHeight(height);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Center view on first real container measurement
  const initialFitDone = useRef(false);
  useEffect(() => {
    if (!initialFitDone.current && containerWidth > 0 && containerHeight > 0) {
      initialFitDone.current = true;
      const bs = Math.min(
        (containerWidth - FIT_PADDING * 2) / canvasWidth,
        (containerHeight - FIT_PADDING * 2) / canvasHeight,
      );
      setUserScale(1);
      setStagePos({
        x: (containerWidth - canvasWidth * bs) / 2,
        y: (containerHeight - canvasHeight * bs) / 2,
      });
    }
  }, [containerWidth, containerHeight, canvasWidth, canvasHeight]);

  // Wheel zoom (centered on pointer)
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = scale;
    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newUserScale = clampScale(MIN_SCALE, MAX_SCALE,
      (direction > 0 ? oldScale * ZOOM_SPEED : oldScale / ZOOM_SPEED) / baseScale
    );
    const newScale = baseScale * newUserScale;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    setUserScale(newUserScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, [scale, baseScale]);

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

    const rect = stage.container().getBoundingClientRect();
    const stageCenter = { x: center.x - rect.left, y: center.y - rect.top };

    if (lastPinchDist.current != null && lastPinchCenter.current != null) {
      const oldScale = scale;
      const scaleFactor = dist / lastPinchDist.current;
      const newScale = clampScale(MIN_SCALE, MAX_SCALE, oldScale * scaleFactor / baseScale) * baseScale;
      const newUserScale = newScale / baseScale;

      const mousePointTo = {
        x: (stageCenter.x - stage.x()) / oldScale,
        y: (stageCenter.y - stage.y()) / oldScale,
      };

      const dx = stageCenter.x - lastPinchCenter.current.x;
      const dy = stageCenter.y - lastPinchCenter.current.y;

      setUserScale(newUserScale);
      setStagePos({
        x: stageCenter.x - mousePointTo.x * newScale + dx,
        y: stageCenter.y - mousePointTo.y * newScale + dy,
      });
    }

    lastPinchDist.current = dist;
    lastPinchCenter.current = stageCenter;
  }, [scale, baseScale]);

  const handleTouchEnd = useCallback(() => {
    lastPinchDist.current = null;
    lastPinchCenter.current = null;
  }, []);

  // Prevent default touch behavior on the canvas container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };
    el.addEventListener('touchmove', prevent, { passive: false });
    return () => el.removeEventListener('touchmove', prevent);
  }, []);

  // Stage drag end (pan)
  const handleStageDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage()) {
      setStagePos({ x: e.target.x(), y: e.target.y() });
    }
  }, []);

  // Attach transformer to selected sub-plot
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;

    if (selectedSubPlotId) {
      const node = subPlotRefs.current.get(selectedSubPlotId);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedSubPlotId, subPlots]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      onSelectSubPlot(null);
    }
  }, [onSelectSubPlot]);

  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (!snapEnabled) return;
    const node = e.target;
    node.x(snapTo(node.x(), PX_PER_FT));
    node.y(snapTo(node.y(), PX_PER_FT));
  }, [snapEnabled]);

  const handleTransformEnd = useCallback((spId: string, geometry: { x: number; y: number; width: number; height: number; rotation: number }) => {
    const node = subPlotRefs.current.get(spId);
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

    onSubPlotDragEnd(spId, {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      rotation: node.rotation(),
    });
  }, [onSubPlotDragEnd, snapEnabled]);

  // Scale-aware sizes so visual elements stay consistent on screen regardless of zoom
  const labelFontSize = Math.max(2, Math.min(11, 12 / scale));
  const dimFontSize = Math.max(1.5, Math.min(9, 10 / scale));
  const textPad = Math.max(1, Math.min(4, 4 / scale));
  const borderWidth = Math.max(0.25, 1 / scale);
  const selectedBorderWidth = Math.max(0.5, 2.5 / scale);
  const gridLineWidth = Math.max(0.25, 1 / scale);
  const cornerRadius = Math.max(0.5, 3 / scale);
  const shadowBlur = Math.max(0.5, 2 / scale);
  const selectedShadowBlur = Math.max(1, 6 / scale);

  const colCount = Math.ceil(canvasWidth / PX_PER_FT);
  const rowCount = Math.ceil(canvasHeight / PX_PER_FT);

  const zoomPercent = Math.round(scale * 100);

  return (
    <div ref={containerRef} className="w-full h-[60vh] min-h-[300px] rounded-lg border bg-card overflow-hidden relative touch-none">
      {/* Top toolbar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <button
          onClick={() => zoomByFactor(1 / BUTTON_ZOOM)}
          className="w-7 h-7 flex items-center justify-center text-sm font-bold rounded border bg-background text-muted-foreground border-border hover:bg-muted transition-colors"
          title="Zoom out"
        >
          &minus;
        </button>
        <button
          onClick={() => zoomByFactor(BUTTON_ZOOM)}
          className="w-7 h-7 flex items-center justify-center text-sm font-bold rounded border bg-background text-muted-foreground border-border hover:bg-muted transition-colors"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={fitView}
          className="px-2 py-1 text-xs font-medium rounded border bg-background text-muted-foreground border-border hover:bg-muted transition-colors"
          title="Fit to view"
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
          <div className="border-t border-muted-foreground" style={{ width: PX_PER_FT * scale }} />
          <span>1 ft</span>
        </div>
        <span>{zoomPercent}%</span>
      </div>

      <Stage
        ref={stageRef}
        width={displayWidth}
        height={displayHeight}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDragEnd={handleStageDragEnd}
      >
        {/* Grid layer */}
        <Layer listening={false}>
          {/* Background */}
          <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#f5f0e8" />

          {/* Grid lines every 1 ft */}
          {Array.from({ length: colCount + 1 }).map((_, i) => (
            <Line
              key={`gv-${i}`}
              points={[i * PX_PER_FT, 0, i * PX_PER_FT, canvasHeight]}
              stroke="#c5c2b5"
              strokeWidth={gridLineWidth}
              opacity={0.6}
            />
          ))}
          {Array.from({ length: rowCount + 1 }).map((_, i) => (
            <Line
              key={`gh-${i}`}
              points={[0, i * PX_PER_FT, canvasWidth, i * PX_PER_FT]}
              stroke="#c5c2b5"
              strokeWidth={gridLineWidth}
              opacity={0.6}
            />
          ))}

          {/* Foot labels — every foot for small plots, every 5ft for large */}
          {Array.from({ length: colCount + 1 }).map((_, i) => {
            if (i === 0) return null;
            if (colCount > 10 && i % 5 !== 0) return null;
            return (
              <Text key={`lx-${i}`} x={i * PX_PER_FT + textPad} y={textPad} text={`${i}'`} fontSize={dimFontSize} fill="#999" />
            );
          })}
          {Array.from({ length: rowCount + 1 }).map((_, i) => {
            if (i === 0) return null;
            if (rowCount > 10 && i % 5 !== 0) return null;
            return (
              <Text key={`ly-${i}`} x={textPad} y={i * PX_PER_FT + textPad} text={`${i}'`} fontSize={dimFontSize} fill="#999" />
            );
          })}
        </Layer>

        {/* Sub-plots layer */}
        <Layer>
          {subPlots.map((sp) => {
            const g = sp.geometry;
            const isSelected = sp.id === selectedSubPlotId;
            const hasPlant = !!sp.plant_instance_id;
            const fillColor = hasPlant ? PLOT_COLORS.raised_bed : '#d4d4d8';
            const label = sp.plant_name || (hasPlant ? 'Planted' : 'Empty');
            const widthLabel = (g.width / PX_PER_FT).toFixed(1).replace(/\.0$/, '');
            const heightLabel = (g.height / PX_PER_FT).toFixed(1).replace(/\.0$/, '');

            return (
              <Group
                key={sp.id}
                ref={(node: Konva.Group) => {
                  if (node) subPlotRefs.current.set(sp.id, node);
                  else subPlotRefs.current.delete(sp.id);
                }}
                x={g.x}
                y={g.y}
                rotation={g.rotation}
                draggable
                onClick={() => onSelectSubPlot(sp.id)}
                onTap={() => onSelectSubPlot(sp.id)}
                onDblClick={() => onSubPlotDoubleClick(sp.id)}
                onDblTap={() => onSubPlotDoubleClick(sp.id)}
                onDragMove={handleDragMove}
                onDragEnd={(e) => {
                  const x = snapEnabled ? snapTo(e.target.x(), PX_PER_FT) : e.target.x();
                  const y = snapEnabled ? snapTo(e.target.y(), PX_PER_FT) : e.target.y();
                  onSubPlotDragEnd(sp.id, { ...g, x, y });
                }}
                onTransformEnd={() => handleTransformEnd(sp.id, g)}
              >
                <Rect
                  width={g.width}
                  height={g.height}
                  fill={fillColor}
                  opacity={0.75}
                  cornerRadius={cornerRadius}
                  stroke={isSelected ? '#F4D03F' : '#555'}
                  strokeWidth={isSelected ? selectedBorderWidth : borderWidth}
                  shadowColor="rgba(0,0,0,0.1)"
                  shadowBlur={isSelected ? selectedShadowBlur : shadowBlur}
                />
                <Text
                  text={label}
                  x={textPad}
                  y={textPad}
                  fontSize={labelFontSize}
                  fontStyle="bold"
                  fill="white"
                  width={g.width - textPad * 2}
                  ellipsis
                  wrap="none"
                  listening={false}
                />
                {g.height > labelFontSize + dimFontSize + textPad * 3 && (
                  <Text
                    text={`${widthLabel}' x ${heightLabel}'`}
                    x={textPad}
                    y={g.height - dimFontSize - textPad}
                    fontSize={dimFontSize}
                    fill="rgba(255,255,255,0.8)"
                    width={g.width - textPad * 2}
                    ellipsis
                    wrap="none"
                    listening={false}
                  />
                )}
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
            borderStrokeWidth={selectedBorderWidth}
            anchorStroke="#F4D03F"
            anchorFill="#fff"
            anchorSize={Math.max(8, 14 / scale)}
            boundBoxFunc={(_oldBox, newBox) => {
              if (newBox.width < PX_PER_FT || newBox.height < PX_PER_FT) {
                return _oldBox;
              }
              if (snapEnabled) {
                return {
                  ...newBox,
                  x: snapTo(newBox.x, PX_PER_FT),
                  y: snapTo(newBox.y, PX_PER_FT),
                  width: Math.max(PX_PER_FT, snapTo(newBox.width, PX_PER_FT)),
                  height: Math.max(PX_PER_FT, snapTo(newBox.height, PX_PER_FT)),
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
