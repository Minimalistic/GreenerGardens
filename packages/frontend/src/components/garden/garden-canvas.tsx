import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Line, Text, Group, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { SubPlotWithPlant } from '@/hooks/use-sub-plots';
import { plantTypeEmoji } from '@/lib/plant-type-emoji';
import { useTheme } from '@/components/theme-provider';
import type { Plot, PlotGeometry, GardenObject, GardenObjectGeometry } from '@gardenvault/shared';

export const PX_PER_FT = 40;

const MIN_SCALE = 0.1;
const MAX_SCALE = 3;
const ZOOM_SPEED = 1.08;
const BUTTON_ZOOM = 1.3;
const FIT_PADDING = 40;

const PLOT_COLORS: Record<string, string> = {
  raised_bed: '#4A7C59',
  in_ground: '#8B6914',
  container: '#D4956A',
  greenhouse: '#87CEEB',
  vertical: '#3D5A3E',
  hydroponic: '#6CB4EE',
  other: '#999',
};

const OBJECT_COLORS: Record<string, string> = {
  house: '#78716c',
  shed: '#a1887f',
  greenhouse: '#81c784',
  chicken_coop: '#d4a373',
  fence: '#8d6e63',
  tree: '#2e7d32',
  path: '#bdbdbd',
  driveway: '#bdbdbd',
  pond: '#42a5f5',
  compost: '#6d4c41',
  patio: '#b0bec5',
  deck: '#a1887f',
  other: '#90a4ae',
};

interface ContextMenuEvent {
  x: number;
  y: number;
  plotId: string | null;
}

interface PropertyBounds {
  width_ft: number;
  height_ft: number;
}

interface Props {
  plots: Plot[];
  gardenObjects?: GardenObject[];
  selectedPlotId: string | null;
  selectedObjectId?: string | null;
  onSelectPlot: (id: string | null) => void;
  onSelectObject?: (id: string | null) => void;
  onPlotDragEnd: (id: string, geometry: PlotGeometry) => void;
  onObjectDragEnd?: (id: string, geometry: GardenObjectGeometry) => void;
  onContextMenu?: (e: ContextMenuEvent) => void;
  onPlotDoubleClick?: (id: string) => void;
  subPlotsByPlot?: Map<string, SubPlotWithPlant[]>;
  propertyBounds?: PropertyBounds;
  objectsLocked?: boolean;
}

function snapTo(value: number, grid: number) {
  return Math.round(value / grid) * grid;
}

function clampScale(s: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

export function GardenCanvas({
  plots,
  gardenObjects = [],
  selectedPlotId,
  selectedObjectId,
  onSelectPlot,
  onSelectObject,
  onPlotDragEnd,
  onObjectDragEnd,
  onContextMenu,
  onPlotDoubleClick,
  subPlotsByPlot,
  propertyBounds,
  objectsLocked = false,
}: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const plotRefs = useRef<Map<string, Konva.Group>>(new Map());
  const objectRefs = useRef<Map<string, Konva.Group>>(new Map());
  const transformAnchor = useRef<{ left: number; top: number; right: number; bottom: number; width: number; height: number } | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const hasFitted = useRef(false);

  // Compute bounding box of all plots, objects, and property boundary
  const getContentBounds = useCallback(() => {
    const allGeometries: { x: number; y: number; width: number; height: number }[] = [];

    // Include property boundary as the primary bounds
    if (propertyBounds) {
      allGeometries.push({
        x: 0,
        y: 0,
        width: propertyBounds.width_ft * PX_PER_FT,
        height: propertyBounds.height_ft * PX_PER_FT,
      });
    }

    for (const plot of plots) {
      const dims = plot.dimensions;
      const defaultW = dims ? dims.width_ft * PX_PER_FT : 120;
      const defaultH = dims ? dims.length_ft * PX_PER_FT : 80;
      const g = plot.geometry ?? { x: PX_PER_FT, y: PX_PER_FT, width: defaultW, height: defaultH };
      allGeometries.push(g);
    }

    for (const obj of gardenObjects) {
      if (obj.geometry) allGeometries.push(obj.geometry);
    }

    if (allGeometries.length === 0) return { x: 0, y: 0, width: 800, height: 600 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const g of allGeometries) {
      minX = Math.min(minX, g.x);
      minY = Math.min(minY, g.y);
      maxX = Math.max(maxX, g.x + g.width);
      maxY = Math.max(maxY, g.y + g.height);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [plots, gardenObjects, propertyBounds]);

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

  // Zoom by factor, centered on viewport center
  const zoomByFactor = useCallback((factor: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stageScale;
    const newScale = clampScale(oldScale * factor);
    const cx = size.width / 2;
    const cy = size.height / 2;
    const pointTo = {
      x: (cx - stagePos.x) / oldScale,
      y: (cy - stagePos.y) / oldScale,
    };
    setStageScale(newScale);
    setStagePos({
      x: cx - pointTo.x * newScale,
      y: cy - pointTo.y * newScale,
    });
  }, [stageScale, size, stagePos]);

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

  // Fit to content on first render when we have content and a valid size
  useEffect(() => {
    if (hasFitted.current || (plots.length === 0 && gardenObjects.length === 0) || size.width <= 1) return;
    hasFitted.current = true;
    fitToContent();
  }, [plots, gardenObjects, size, fitToContent]);

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

  // Stage drag (pan)
  const handleDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target !== e.target.getStage()) return;
  }, []);

  const handleStageDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage()) {
      setStagePos({ x: e.target.x(), y: e.target.y() });
    }
  }, []);

  // Attach transformer to selected plot or object
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

    if (selectedObjectId && !objectsLocked) {
      const node = objectRefs.current.get(selectedObjectId);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }

    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedPlotId, selectedObjectId, objectsLocked, plots, gardenObjects]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      onSelectPlot(null);
      onSelectObject?.(null);
    }
  }, [onSelectPlot, onSelectObject]);

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

  const handleTransformStart = useCallback((geometry: { x: number; y: number; width: number; height: number }) => {
    transformAnchor.current = {
      left: geometry.x,
      top: geometry.y,
      right: geometry.x + geometry.width,
      bottom: geometry.y + geometry.height,
      width: geometry.width,
      height: geometry.height,
    };
  }, []);

  const handleTransform = useCallback((refMap: React.MutableRefObject<Map<string, Konva.Group>>, itemId: string, geometry: { x: number; y: number; width: number; height: number }, minW = PX_PER_FT, minH = PX_PER_FT) => {
    if (!snapEnabled || !transformAnchor.current) return;
    const node = refMap.current.get(itemId);
    if (!node) return;

    const anchor = transformAnchor.current;

    const currentX = node.x();
    const currentY = node.y();
    const actualWidth = geometry.width * node.scaleX();
    const actualHeight = geometry.height * node.scaleY();
    const currentRight = currentX + actualWidth;
    const currentBottom = currentY + actualHeight;

    const leftMoved = Math.abs(currentX - anchor.left) > 0.5;
    const topMoved = Math.abs(currentY - anchor.top) > 0.5;
    const rightMoved = Math.abs(currentRight - anchor.right) > 0.5;
    const bottomMoved = Math.abs(currentBottom - anchor.bottom) > 0.5;

    let newLeft: number, newRight: number, newTop: number, newBottom: number;

    if (leftMoved && !rightMoved) {
      newRight = anchor.right;
      newLeft = snapTo(currentX, PX_PER_FT);
    } else if (rightMoved && !leftMoved) {
      newLeft = anchor.left;
      newRight = snapTo(currentRight, PX_PER_FT);
    } else {
      newLeft = snapTo(currentX, PX_PER_FT);
      newRight = snapTo(currentRight, PX_PER_FT);
    }

    if (topMoved && !bottomMoved) {
      newBottom = anchor.bottom;
      newTop = snapTo(currentY, PX_PER_FT);
    } else if (bottomMoved && !topMoved) {
      newTop = anchor.top;
      newBottom = snapTo(currentBottom, PX_PER_FT);
    } else {
      newTop = snapTo(currentY, PX_PER_FT);
      newBottom = snapTo(currentBottom, PX_PER_FT);
    }

    const newWidth = Math.max(minW, newRight - newLeft);
    const newHeight = Math.max(minH, newBottom - newTop);

    node.x(newLeft);
    node.y(newTop);
    node.scaleX(newWidth / geometry.width);
    node.scaleY(newHeight / geometry.height);
  }, [snapEnabled]);

  const handlePlotTransform = useCallback((plotId: string, geometry: { x: number; y: number; width: number; height: number }) => {
    const { minW, minH } = getMinPlotSize(plotId);
    handleTransform(plotRefs, plotId, geometry, minW, minH);
  }, [handleTransform, getMinPlotSize]);

  const handleObjectTransform = useCallback((objectId: string, geometry: { x: number; y: number; width: number; height: number }) => {
    handleTransform(objectRefs, objectId, geometry);
  }, [handleTransform]);

  const handleTransformEnd = useCallback((refMap: React.MutableRefObject<Map<string, Konva.Group>>, itemId: string, geometry: { x: number; y: number; width: number; height: number }, minW: number, minH: number, onDragEnd: (id: string, geom: PlotGeometry) => void) => {
    const node = refMap.current.get(itemId);
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    let newX = node.x();
    let newY = node.y();
    let newWidth = Math.max(minW, Math.round(geometry.width * scaleX));
    let newHeight = Math.max(minH, Math.round(geometry.height * scaleY));

    if (snapEnabled) {
      newX = snapTo(newX, PX_PER_FT);
      newY = snapTo(newY, PX_PER_FT);
      const farX = snapTo(newX + newWidth, PX_PER_FT);
      const farY = snapTo(newY + newHeight, PX_PER_FT);
      newWidth = Math.max(minW, farX - newX);
      newHeight = Math.max(minH, farY - newY);
    }

    transformAnchor.current = null;

    onDragEnd(itemId, {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      rotation: 0,
    });
  }, [snapEnabled]);

  const handlePlotTransformEnd = useCallback((plotId: string, geometry: { x: number; y: number; width: number; height: number }) => {
    const { minW, minH } = getMinPlotSize(plotId);
    handleTransformEnd(plotRefs, plotId, geometry, minW, minH, onPlotDragEnd);
  }, [handleTransformEnd, getMinPlotSize, onPlotDragEnd]);

  const handleObjectTransformEnd = useCallback((objectId: string, geometry: { x: number; y: number; width: number; height: number }) => {
    if (!onObjectDragEnd) return;
    handleTransformEnd(objectRefs, objectId, geometry, PX_PER_FT, PX_PER_FT, onObjectDragEnd);
  }, [handleTransformEnd, onObjectDragEnd]);

  // Right-click handler
  const handleContextMenu = useCallback((e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    if (!onContextMenu) return;

    const stage = stageRef.current;
    if (!stage) return;

    const target = e.target;
    let plotId: string | null = null;

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
  const handleMouseEnter = useCallback(() => {
    const stage = stageRef.current;
    if (stage) stage.container().style.cursor = 'pointer';
  }, []);

  const handleMouseLeave = useCallback(() => {
    const stage = stageRef.current;
    if (stage) stage.container().style.cursor = 'default';
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

  // Grid colors — dimmer in light mode, much dimmer in dark mode
  const gridMajorColor = isDark ? '#555' : '#c5c2b5';
  const gridMinorColor = isDark ? '#444' : '#e5e2d9';
  const gridMajorOpacity = isDark ? 0.3 : 0.5;
  const gridMinorOpacity = isDark ? 0.15 : 0.3;
  const gridLabelColor = isDark ? '#666' : '#aaa';

  // Get the minimum size for the currently selected item (for transformer bounds)
  const getSelectedMinSize = useCallback(() => {
    if (selectedPlotId) return getMinPlotSize(selectedPlotId);
    return { minW: PX_PER_FT, minH: PX_PER_FT };
  }, [selectedPlotId, getMinPlotSize]);

  return (
    <div ref={containerRef} className="w-full h-full rounded-lg border bg-card overflow-hidden relative touch-none">
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
          {/* Grid lines */}
          {Array.from({ length: gridEndCol - gridStartCol + 1 }).map((_, i) => {
            const col = gridStartCol + i;
            return (
              <Rect
                key={`gv-${col}`}
                x={col * PX_PER_FT}
                y={visibleTopLeft.y}
                width={1 / stageScale}
                height={visibleBottomRight.y - visibleTopLeft.y}
                fill={col % 5 === 0 ? gridMajorColor : gridMinorColor}
                opacity={col % 5 === 0 ? gridMajorOpacity : gridMinorOpacity}
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
                fill={row % 5 === 0 ? gridMajorColor : gridMinorColor}
                opacity={row % 5 === 0 ? gridMajorOpacity : gridMinorOpacity}
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
                fill={gridLabelColor}
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
                fill={gridLabelColor}
              />
            );
          })}

          {/* Property boundary */}
          {propertyBounds && (
            <>
              <Rect
                x={0}
                y={0}
                width={propertyBounds.width_ft * PX_PER_FT}
                height={propertyBounds.height_ft * PX_PER_FT}
                fill={isDark ? 'rgba(34,197,94,0.04)' : 'rgba(34,197,94,0.06)'}
              />
              <Line
                points={[
                  0, 0,
                  propertyBounds.width_ft * PX_PER_FT, 0,
                  propertyBounds.width_ft * PX_PER_FT, propertyBounds.height_ft * PX_PER_FT,
                  0, propertyBounds.height_ft * PX_PER_FT,
                  0, 0,
                ]}
                stroke={isDark ? '#4ade80' : '#16a34a'}
                strokeWidth={2.5 / stageScale}
                dash={[12 / stageScale, 6 / stageScale]}
                opacity={0.8}
              />
              {/* Corner dimension labels */}
              <Text
                x={4 / stageScale}
                y={propertyBounds.height_ft * PX_PER_FT + 4 / stageScale}
                text={`${propertyBounds.width_ft}' × ${propertyBounds.height_ft}'`}
                fontSize={11 / stageScale}
                fill={isDark ? '#4ade80' : '#16a34a'}
                opacity={0.7}
              />
              {/* North indicator */}
              <Text
                x={propertyBounds.width_ft * PX_PER_FT / 2 - 8 / stageScale}
                y={-18 / stageScale}
                text="N ↑"
                fontSize={12 / stageScale}
                fontStyle="bold"
                fill={isDark ? '#4ade80' : '#16a34a'}
                opacity={0.6}
              />
            </>
          )}
        </Layer>

        {/* Objects layer (rendered below plots) */}
        <Layer>
          {gardenObjects.map((obj) => {
            const g = obj.geometry ?? { x: PX_PER_FT, y: PX_PER_FT, width: 120, height: 80, rotation: 0 };
            const isSelected = obj.id === selectedObjectId;
            const color = obj.color || OBJECT_COLORS[obj.object_type] || OBJECT_COLORS.other;
            const widthFt = (g.width / PX_PER_FT).toFixed(0);
            const heightFt = (g.height / PX_PER_FT).toFixed(0);

            return (
              <Group
                key={obj.id}
                ref={(node: Konva.Group) => {
                  if (node) objectRefs.current.set(obj.id, node);
                  else objectRefs.current.delete(obj.id);
                }}
                x={g.x}
                y={g.y}
                rotation={0}
                draggable={!objectsLocked}
                listening={!objectsLocked}
                onClick={objectsLocked ? undefined : () => { onSelectObject?.(obj.id); onSelectPlot(null); }}
                onTap={objectsLocked ? undefined : () => { onSelectObject?.(obj.id); onSelectPlot(null); }}
                onDragMove={objectsLocked ? undefined : handleDragMove}
                onDragEnd={objectsLocked ? undefined : (e) => {
                  const x = snapEnabled ? snapTo(e.target.x(), PX_PER_FT) : e.target.x();
                  const y = snapEnabled ? snapTo(e.target.y(), PX_PER_FT) : e.target.y();
                  onObjectDragEnd?.(obj.id, { ...g, x, y });
                }}
                onTransformStart={objectsLocked ? undefined : () => handleTransformStart(g)}
                onTransform={objectsLocked ? undefined : () => handleObjectTransform(obj.id, g)}
                onTransformEnd={objectsLocked ? undefined : () => handleObjectTransformEnd(obj.id, g)}
                onMouseEnter={objectsLocked ? undefined : handleMouseEnter}
                onMouseLeave={objectsLocked ? undefined : handleMouseLeave}
              >
                {obj.object_type === 'fence' ? (
                  <>
                    {/* Fence: hollow enclosure with post markers */}
                    <Rect
                      width={g.width}
                      height={g.height}
                      fill="transparent"
                      stroke={isSelected ? '#F4D03F' : color}
                      strokeWidth={isSelected ? 3.5 : 2.5}
                      dash={[10, 5]}
                      shadowColor="rgba(0,0,0,0.15)"
                      shadowBlur={isSelected ? 6 : 2}
                    />
                    {/* Fence posts at corners and every ~8ft along edges */}
                    {(() => {
                      const postSize = 5;
                      const postColor = isSelected ? '#F4D03F' : (obj.color || '#6d4c41');
                      const posts: { px: number; py: number }[] = [];
                      const spacing = 8 * PX_PER_FT;
                      // Top & bottom edges
                      for (let x = 0; x <= g.width; x += spacing) {
                        posts.push({ px: Math.min(x, g.width), py: 0 });
                        posts.push({ px: Math.min(x, g.width), py: g.height });
                      }
                      // Ensure far corners
                      posts.push({ px: g.width, py: 0 });
                      posts.push({ px: g.width, py: g.height });
                      // Left & right edges (skip corners already added)
                      for (let y = spacing; y < g.height; y += spacing) {
                        posts.push({ px: 0, py: y });
                        posts.push({ px: g.width, py: y });
                      }
                      return posts.map((p, i) => (
                        <Rect
                          key={`post-${i}`}
                          x={p.px - postSize / 2}
                          y={p.py - postSize / 2}
                          width={postSize}
                          height={postSize}
                          fill={postColor}
                          cornerRadius={1}
                          listening={false}
                        />
                      ));
                    })()}
                    {obj.label_visible !== false && (
                      <>
                        <Text
                          text={obj.name}
                          x={8}
                          y={-16}
                          fontSize={10}
                          fontStyle="bold"
                          fill={isDark ? '#d4a373' : '#6d4c41'}
                          listening={false}
                        />
                        <Text
                          text={`${widthFt}' × ${heightFt}'`}
                          x={8}
                          y={g.height + 4}
                          fontSize={9}
                          fill={isDark ? '#a1887f' : '#8d6e63'}
                          listening={false}
                        />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Rect
                      width={g.width}
                      height={g.height}
                      fill={color}
                      opacity={obj.opacity ?? 0.7}
                      cornerRadius={2}
                      stroke={isSelected ? '#F4D03F' : 'rgba(0,0,0,0.3)'}
                      strokeWidth={isSelected ? 3 : 1}
                      shadowColor="rgba(0,0,0,0.1)"
                      shadowBlur={isSelected ? 6 : 1}
                    />
                    {obj.label_visible !== false && (
                      <>
                        <Text
                          text={obj.name}
                          x={4}
                          y={4}
                          fontSize={11}
                          fontStyle="bold"
                          fill="white"
                          width={g.width - 8}
                          ellipsis
                          wrap="none"
                          listening={false}
                        />
                        <Text
                          text={`${widthFt}' x ${heightFt}'`}
                          x={4}
                          y={g.height - 16}
                          fontSize={9}
                          fill="rgba(255,255,255,0.7)"
                          width={g.width - 8}
                          ellipsis
                          wrap="none"
                          listening={false}
                        />
                      </>
                    )}
                  </>
                )}
              </Group>
            );
          })}
        </Layer>

        {/* Plots layer */}
        <Layer>
          {plots.map((plot) => {
            const dims = plot.dimensions;
            const defaultW = dims ? dims.width_ft * PX_PER_FT : 120;
            const defaultH = dims ? dims.length_ft * PX_PER_FT : 80;
            const g = plot.geometry ?? { x: PX_PER_FT, y: PX_PER_FT, width: defaultW, height: defaultH, rotation: 0 };
            const isSelected = plot.id === selectedPlotId;
            const color = PLOT_COLORS[plot.plot_type] ?? PLOT_COLORS.other;
            const widthFt = (g.width / PX_PER_FT).toFixed(1).replace(/\.0$/, '');
            const heightFt = (g.height / PX_PER_FT).toFixed(1).replace(/\.0$/, '');

            const subPlots = subPlotsByPlot?.get(plot.id);

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
                onClick={() => { onSelectPlot(plot.id); onSelectObject?.(null); }}
                onTap={() => { onSelectPlot(plot.id); onSelectObject?.(null); }}
                onDblClick={() => onPlotDoubleClick?.(plot.id)}
                onDblTap={() => onPlotDoubleClick?.(plot.id)}
                onDragMove={handleDragMove}
                onDragEnd={(e) => {
                  const x = snapEnabled ? snapTo(e.target.x(), PX_PER_FT) : e.target.x();
                  const y = snapEnabled ? snapTo(e.target.y(), PX_PER_FT) : e.target.y();
                  onPlotDragEnd(plot.id, { ...g, x, y });
                }}
                onTransformStart={() => handleTransformStart(g)}
                onTransform={() => handlePlotTransform(plot.id, g)}
                onTransformEnd={() => handlePlotTransformEnd(plot.id, g)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <Rect
                  width={g.width}
                  height={g.height}
                  fill="#8B7355"
                  opacity={0.85}
                  cornerRadius={4}
                  stroke={isSelected ? '#F4D03F' : '#5C4A32'}
                  strokeWidth={isSelected ? 3 : 1.5}
                  shadowColor="rgba(0,0,0,0.15)"
                  shadowBlur={isSelected ? 8 : 2}
                />

                {/* Sub-plot shapes within the plot */}
                {subPlots?.map(sp => {
                  const spg = sp.geometry;
                  if (!spg) return null;
                  const hasPlant = !!sp.plant_instance_id;
                  const emoji = hasPlant ? (sp.emoji || plantTypeEmoji(sp.plant_type)) : '';
                  const emojiSize = Math.min(spg.width, spg.height) * 0.55;
                  return (
                    <Group key={sp.id} x={spg.x} y={spg.y} listening={false}>
                      <Rect
                        width={spg.width}
                        height={spg.height}
                        fill={hasPlant ? '#4ade80' : color}
                        opacity={hasPlant ? 0.8 : 0.55}
                        stroke="rgba(255,255,255,0.8)"
                        strokeWidth={1.5}
                        cornerRadius={2}
                      />
                      {emoji && (
                        <Text
                          text={emoji}
                          x={0}
                          y={(spg.height - emojiSize) / 2}
                          width={spg.width}
                          height={emojiSize}
                          fontSize={emojiSize}
                          align="center"
                        />
                      )}
                    </Group>
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
            ignoreStroke
            enabledAnchors={[
              'top-left', 'top-right', 'bottom-left', 'bottom-right',
              'middle-left', 'middle-right', 'top-center', 'bottom-center',
            ]}
            borderStroke="#F4D03F"
            borderStrokeWidth={2}
            anchorStroke="#F4D03F"
            anchorFill="#fff"
            anchorSize={14}
            boundBoxFunc={(oldBox, newBox) => {
              const { minW, minH } = getSelectedMinSize();
              if (newBox.width < minW || newBox.height < minH) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
}
