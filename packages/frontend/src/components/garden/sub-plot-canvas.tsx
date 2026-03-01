import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Transformer, Line } from 'react-konva';
import type Konva from 'konva';
import { PX_PER_FT } from './garden-canvas';
import type { SubPlotWithPlant } from '@/hooks/use-sub-plots';

function snapTo(value: number, grid: number) {
  return Math.round(value / grid) * grid;
}

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
  const [containerWidth, setContainerWidth] = useState(800);
  const [snapEnabled, setSnapEnabled] = useState(true);

  // Canvas dimensions in pixels based on plot dimensions
  const canvasWidth = widthFt * PX_PER_FT;
  const canvasHeight = lengthFt * PX_PER_FT;

  // Scale to fit the container width (scale up for small plots, down for large)
  const scale = containerWidth / canvasWidth;
  const displayWidth = canvasWidth * scale;
  const displayHeight = canvasHeight * scale;

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setContainerWidth(width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
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

  const colCount = Math.ceil(canvasWidth / PX_PER_FT);
  const rowCount = Math.ceil(canvasHeight / PX_PER_FT);

  return (
    <div ref={containerRef} className="w-full rounded-lg border bg-card overflow-hidden relative">
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
        <div className="border-t border-muted-foreground" style={{ width: PX_PER_FT * scale }} />
        <span>1 ft</span>
      </div>

      <Stage
        ref={stageRef}
        width={displayWidth}
        height={displayHeight}
        scaleX={scale}
        scaleY={scale}
        onClick={handleStageClick}
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
              strokeWidth={1}
              opacity={0.6}
            />
          ))}
          {Array.from({ length: rowCount + 1 }).map((_, i) => (
            <Line
              key={`gh-${i}`}
              points={[0, i * PX_PER_FT, canvasWidth, i * PX_PER_FT]}
              stroke="#c5c2b5"
              strokeWidth={1}
              opacity={0.6}
            />
          ))}

          {/* Foot labels — every foot for small plots, every 5ft for large */}
          {Array.from({ length: colCount + 1 }).map((_, i) => {
            if (i === 0) return null;
            // Show every foot if plot <= 10ft, otherwise every 5ft
            if (colCount > 10 && i % 5 !== 0) return null;
            return (
              <Text key={`lx-${i}`} x={i * PX_PER_FT + 2} y={2} text={`${i}'`} fontSize={9} fill="#999" />
            );
          })}
          {Array.from({ length: rowCount + 1 }).map((_, i) => {
            if (i === 0) return null;
            if (rowCount > 10 && i % 5 !== 0) return null;
            return (
              <Text key={`ly-${i}`} x={2} y={i * PX_PER_FT + 2} text={`${i}'`} fontSize={9} fill="#999" />
            );
          })}
        </Layer>

        {/* Sub-plots layer */}
        <Layer>
          {subPlots.map((sp) => {
            const g = sp.geometry;
            const isSelected = sp.id === selectedSubPlotId;
            const hasPlant = !!sp.plant_instance_id;
            const fillColor = hasPlant ? '#4A7C59' : '#d4d4d8';
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
                  cornerRadius={3}
                  stroke={isSelected ? '#F4D03F' : '#555'}
                  strokeWidth={isSelected ? 3 : 1}
                  shadowColor="rgba(0,0,0,0.1)"
                  shadowBlur={isSelected ? 6 : 2}
                />
                <Text
                  text={label}
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
                {g.width >= PX_PER_FT * 1.5 && g.height >= PX_PER_FT * 1.2 && (
                  <Text
                    text={`${widthLabel}' x ${heightLabel}'`}
                    x={4}
                    y={g.height - 16}
                    fontSize={9}
                    fill="rgba(255,255,255,0.8)"
                    width={g.width - 8}
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
            enabledAnchors={[
              'top-left', 'top-right', 'bottom-left', 'bottom-right',
              'middle-left', 'middle-right', 'top-center', 'bottom-center',
            ]}
            borderStroke="#F4D03F"
            borderStrokeWidth={2}
            anchorStroke="#F4D03F"
            anchorFill="#fff"
            anchorSize={7}
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
