import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Circle,
  Copy,
  Download,
  Minus,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  Triangle,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type ShapeKind = "rectangle" | "circle" | "triangle" | "oval";

type VectorShape = {
  id: number;
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
};

type DragState = {
  id: number;
  pointerId: number;
  offsetX: number;
  offsetY: number;
} | null;

const VIEWBOX = { width: 880, height: 500 };
const STORAGE_KEY = "bezier-shape-studio-v1";

const SHAPES: Array<{ kind: ShapeKind; label: string }> = [
  { kind: "rectangle", label: "Rectangle" },
  { kind: "circle", label: "Circle" },
  { kind: "triangle", label: "Triangle" },
  { kind: "oval", label: "Oval" },
];

const FILLS = [
  { name: "Yellow", value: "#ffdd57" },
  { name: "Blue", value: "#5f8cff" },
  { name: "Red", value: "#ff786c" },
  { name: "Green", value: "#55c79a" },
  { name: "Purple", value: "#a984e8" },
  { name: "White", value: "#ffffff" },
];

const STROKES = [
  { name: "Black", value: "#111936" },
  { name: "Blue", value: "#315ee7" },
  { name: "Red", value: "#c8384f" },
  { name: "Green", value: "#177b5d" },
];

const STROKE_WIDTHS = [
  { label: "Thin", value: 2 },
  { label: "Medium", value: 6 },
  { label: "Thick", value: 12 },
];

const ADD_POSITIONS = [
  { x: 440, y: 245 },
  { x: 335, y: 185 },
  { x: 545, y: 185 },
  { x: 335, y: 315 },
  { x: 545, y: 315 },
  { x: 230, y: 245 },
  { x: 650, y: 245 },
  { x: 440, y: 120 },
  { x: 440, y: 390 },
];

function ShapeIcon({ kind }: { kind: ShapeKind }) {
  if (kind === "circle") return <Circle size={27} aria-hidden="true" />;
  if (kind === "triangle") return <Triangle size={27} aria-hidden="true" />;
  if (kind === "oval") return <span className="oval-icon" aria-hidden="true" />;
  return <Square size={27} aria-hidden="true" />;
}

function shapeMarkup(shape: VectorShape) {
  const common = `fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" stroke-linejoin="round"`;
  if (shape.kind === "circle") {
    return `<circle cx="${shape.x}" cy="${shape.y}" r="${shape.width / 2}" ${common}/>`;
  }
  if (shape.kind === "oval") {
    return `<ellipse cx="${shape.x}" cy="${shape.y}" rx="${shape.width / 2}" ry="${shape.height / 2}" ${common}/>`;
  }
  if (shape.kind === "triangle") {
    const points = `${shape.x},${shape.y - shape.height / 2} ${shape.x + shape.width / 2},${shape.y + shape.height / 2} ${shape.x - shape.width / 2},${shape.y + shape.height / 2}`;
    return `<polygon points="${points}" ${common}/>`;
  }
  return `<rect x="${shape.x - shape.width / 2}" y="${shape.y - shape.height / 2}" width="${shape.width}" height="${shape.height}" rx="8" ${common}/>`;
}

function downloadDrawing(shapes: VectorShape[]) {
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 500" role="img" aria-labelledby="title desc">
  <title id="title">Geometric figure drawing</title>
  <desc id="desc">A student composition made with geometric figures, fill colors and different outlines.</desc>
  <rect width="880" height="500" fill="#ffffff"/>
${shapes.map(shapeMarkup).join("\n")}
</svg>`;
  const url = URL.createObjectURL(new Blob([content], { type: "image/svg+xml" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "my-geometric-robot.svg";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function RobotExample() {
  return (
    <svg className="robot-example" viewBox="0 0 250 220" role="img" aria-label="Example robot made from rectangles, circles, an oval and a triangle">
      <rect width="250" height="220" rx="14" fill="#f4f6fb" />
      <line x1="125" y1="34" x2="125" y2="53" stroke="#111936" strokeWidth="6" />
      <circle cx="125" cy="27" r="10" fill="#ff786c" stroke="#111936" strokeWidth="5" />
      <rect x="70" y="50" width="110" height="65" rx="10" fill="#ffdd57" stroke="#111936" strokeWidth="6" />
      <circle cx="103" cy="80" r="10" fill="#ffffff" stroke="#315ee7" strokeWidth="5" />
      <circle cx="147" cy="80" r="10" fill="#ffffff" stroke="#315ee7" strokeWidth="5" />
      <ellipse cx="125" cy="101" rx="23" ry="6" fill="#ff786c" stroke="#111936" strokeWidth="3" />
      <rect x="83" y="121" width="84" height="58" rx="8" fill="#5f8cff" stroke="#111936" strokeWidth="8" />
      <rect x="45" y="130" width="33" height="16" rx="5" fill="#55c79a" stroke="#111936" strokeWidth="5" />
      <rect x="172" y="130" width="33" height="16" rx="5" fill="#55c79a" stroke="#111936" strokeWidth="5" />
      <rect x="94" y="177" width="20" height="31" rx="4" fill="#a984e8" stroke="#111936" strokeWidth="5" />
      <rect x="137" y="177" width="20" height="31" rx="4" fill="#a984e8" stroke="#111936" strokeWidth="5" />
      <polygon points="125,126 141,154 109,154" fill="#ffdd57" stroke="#ffffff" strokeWidth="3" />
    </svg>
  );
}

export default function ShapeStudio() {
  const [shapes, setShapes] = useState<VectorShape[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [message, setMessage] = useState("Choose a figure to begin.");
  const [hydrated, setHydrated] = useState(false);
  const nextId = useRef(1);
  const canvasRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as VectorShape[];
        if (Array.isArray(parsed)) {
          setShapes(parsed);
          nextId.current = Math.max(0, ...parsed.map((shape) => shape.id)) + 1;
          if (parsed.length) setMessage("Your saved drawing is ready. Select a figure to continue.");
        }
      }
    } catch {
      // Start with a blank canvas when a saved drawing is damaged.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(shapes));
  }, [hydrated, shapes]);

  const selected = shapes.find((shape) => shape.id === selectedId) ?? null;
  const kindCount = new Set(shapes.map((shape) => shape.kind)).size;
  const fillCount = new Set(shapes.map((shape) => shape.fill)).size;
  const strokeColorCount = new Set(shapes.map((shape) => shape.stroke)).size;
  const strokeWidthCount = new Set(shapes.map((shape) => shape.strokeWidth)).size;
  const checks = [
    shapes.length >= 8,
    kindCount >= 3,
    fillCount >= 3,
    strokeWidthCount >= 2 && strokeColorCount >= 2,
  ];
  const completedCount = checks.filter(Boolean).length;
  const complete = completedCount === checks.length;

  const instruction = useMemo(() => {
    if (!checks[0]) return `Add geometric figures. You need ${Math.max(0, 8 - shapes.length)} more.`;
    if (!checks[1]) return "Use at least 3 figure types: rectangles, circles, triangles or ovals.";
    if (!checks[2]) return "Select figures and use at least 3 different fill colors.";
    if (!checks[3]) return "Change the outline. Use 2 line colors and 2 line thicknesses.";
    return "Great work! Your geometric drawing is complete. Download it as evidence.";
  }, [checks, shapes.length]);

  const pointFromEvent = (event: ReactPointerEvent<SVGElement>) => {
    const svg = canvasRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEWBOX.width,
      y: ((event.clientY - rect.top) / rect.height) * VIEWBOX.height,
    };
  };

  const addShape = (kind: ShapeKind) => {
    const position = ADD_POSITIONS[shapes.length % ADD_POSITIONS.length];
    const dimensions =
      kind === "circle"
        ? { width: 82, height: 82 }
        : kind === "oval"
          ? { width: 140, height: 78 }
          : kind === "triangle"
            ? { width: 112, height: 96 }
            : { width: 138, height: 92 };
    const shape: VectorShape = {
      id: nextId.current,
      kind,
      ...position,
      ...dimensions,
      fill: FILLS[0].value,
      stroke: "#111936",
      strokeWidth: 6,
    };
    nextId.current += 1;
    setShapes((current) => [...current, shape]);
    setSelectedId(shape.id);
    setMessage(`${SHAPES.find((item) => item.kind === kind)?.label ?? "Figure"} added. Drag it or use the arrow buttons.`);
  };

  const updateSelected = (changes: Partial<VectorShape>) => {
    if (selectedId === null) return;
    setShapes((current) => current.map((shape) => (shape.id === selectedId ? { ...shape, ...changes } : shape)));
  };

  const moveSelected = (dx: number, dy: number) => {
    if (!selected) return;
    updateSelected({
      x: Math.max(28, Math.min(VIEWBOX.width - 28, selected.x + dx)),
      y: Math.max(28, Math.min(VIEWBOX.height - 28, selected.y + dy)),
    });
    setMessage("Figure moved.");
  };

  const resizeSelected = (factor: number) => {
    if (!selected) return;
    updateSelected({
      width: Math.max(36, Math.min(260, selected.width * factor)),
      height: Math.max(36, Math.min(220, selected.height * factor)),
    });
    setMessage(factor > 1 ? "Figure made bigger." : "Figure made smaller.");
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const duplicate = {
      ...selected,
      id: nextId.current,
      x: Math.min(VIEWBOX.width - 30, selected.x + 34),
      y: Math.min(VIEWBOX.height - 30, selected.y + 34),
    };
    nextId.current += 1;
    setShapes((current) => [...current, duplicate]);
    setSelectedId(duplicate.id);
    setMessage("Figure copied. Move the copy to its new place.");
  };

  const deleteSelected = () => {
    if (selectedId === null) return;
    setShapes((current) => current.filter((shape) => shape.id !== selectedId));
    setSelectedId(null);
    setMessage("Figure deleted. Choose another figure to continue.");
  };

  const startDrag = (event: ReactPointerEvent<SVGGElement>, shape: VectorShape) => {
    event.stopPropagation();
    const point = pointFromEvent(event);
    setSelectedId(shape.id);
    setDrag({ id: shape.id, pointerId: event.pointerId, offsetX: point.x - shape.x, offsetY: point.y - shape.y });
    canvasRef.current?.setPointerCapture(event.pointerId);
    setMessage(`${SHAPES.find((item) => item.kind === shape.kind)?.label ?? "Figure"} selected.`);
  };

  const movePointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = pointFromEvent(event);
    setShapes((current) =>
      current.map((shape) =>
        shape.id === drag.id
          ? {
              ...shape,
              x: Math.max(28, Math.min(VIEWBOX.width - 28, point.x - drag.offsetX)),
              y: Math.max(28, Math.min(VIEWBOX.height - 28, point.y - drag.offsetY)),
            }
          : shape,
      ),
    );
  };

  const stopPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (canvasRef.current?.hasPointerCapture(event.pointerId)) canvasRef.current.releasePointerCapture(event.pointerId);
    setDrag(null);
    setMessage("Figure placed. Now choose its fill or outline.");
  };

  const clearDrawing = () => {
    if (shapes.length && !window.confirm("Start again and remove every figure?")) return;
    setShapes([]);
    setSelectedId(null);
    setMessage("Canvas cleared. Choose a figure to begin.");
  };

  const readInstruction = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(instruction);
    speech.lang = "en-US";
    speech.rate = 0.82;
    window.speechSynthesis.speak(speech);
  };

  const renderShape = (shape: VectorShape) => {
    const common = {
      fill: shape.fill,
      stroke: shape.stroke,
      strokeWidth: shape.strokeWidth,
      strokeLinejoin: "round" as const,
      vectorEffect: "non-scaling-stroke" as const,
    };
    if (shape.kind === "circle") return <circle cx={shape.x} cy={shape.y} r={shape.width / 2} {...common} />;
    if (shape.kind === "oval") return <ellipse cx={shape.x} cy={shape.y} rx={shape.width / 2} ry={shape.height / 2} {...common} />;
    if (shape.kind === "triangle") {
      const points = `${shape.x},${shape.y - shape.height / 2} ${shape.x + shape.width / 2},${shape.y + shape.height / 2} ${shape.x - shape.width / 2},${shape.y + shape.height / 2}`;
      return <polygon points={points} {...common} />;
    }
    return <rect x={shape.x - shape.width / 2} y={shape.y - shape.height / 2} width={shape.width} height={shape.height} rx={8} {...common} />;
  };

  return (
    <div className="guided-workspace">
      <aside className="guided-tools" aria-label="Geometric figure tools">
        <p className="eyebrow">Easy start</p>
        <h2>Build with figures</h2>
        <p className="guided-intro">Make a friendly robot. It can look different from the example.</p>

        <section className="guided-tool-section" aria-labelledby="add-figures-title">
          <h3 id="add-figures-title"><span>1</span> Add a figure</h3>
          <div className="shape-palette">
            {SHAPES.map((item) => (
              <button key={item.kind} type="button" className="shape-button" onClick={() => addShape(item.kind)}>
                <ShapeIcon kind={item.kind} />
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="guided-tool-section" aria-labelledby="fill-title">
          <h3 id="fill-title"><span>2</span> Fill color</h3>
          {!selected && <p className="select-reminder">Select a figure on the canvas first.</p>}
          <div className="color-palette">
            {FILLS.map((color) => (
              <button
                key={color.value}
                type="button"
                className={`color-button ${selected?.fill === color.value ? "active" : ""}`}
                disabled={!selected}
                onClick={() => {
                  updateSelected({ fill: color.value });
                  setMessage(`${color.name} fill applied.`);
                }}
                aria-label={`${color.name} fill`}
                aria-pressed={selected?.fill === color.value}
              >
                <span style={{ background: color.value }} />
                {color.name}
              </button>
            ))}
          </div>
        </section>

        <section className="guided-tool-section" aria-labelledby="outline-title">
          <h3 id="outline-title"><span>3</span> Change outline</h3>
          <div className="color-palette outline-palette">
            {STROKES.map((color) => (
              <button
                key={color.value}
                type="button"
                className={`color-button ${selected?.stroke === color.value ? "active" : ""}`}
                disabled={!selected}
                onClick={() => {
                  updateSelected({ stroke: color.value });
                  setMessage(`${color.name} outline applied.`);
                }}
                aria-label={`${color.name} outline`}
                aria-pressed={selected?.stroke === color.value}
              >
                <span style={{ background: color.value }} />
                {color.name}
              </button>
            ))}
          </div>
          <div className="stroke-options" aria-label="Outline thickness">
            {STROKE_WIDTHS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={!selected}
                className={selected?.strokeWidth === option.value ? "active" : ""}
                onClick={() => {
                  updateSelected({ strokeWidth: option.value });
                  setMessage(`${option.label} outline applied.`);
                }}
                aria-pressed={selected?.strokeWidth === option.value}
              >
                <span className="stroke-sample" style={{ height: option.value }} />
                {option.label}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <main className="guided-studio">
        <div className={`guided-prompt ${complete ? "complete" : ""}`} aria-live="polite">
          <div>
            <strong>{complete ? "Challenge complete" : `Next step ${completedCount + 1} of 4`}</strong>
            <p>{instruction}</p>
          </div>
          <button type="button" onClick={readInstruction} aria-label="Read the instruction aloud">
            <Volume2 size={22} aria-hidden="true" />
            Hear it
          </button>
        </div>

        <div className="guided-actionbar" role="toolbar" aria-label="Selected figure controls">
          <div className="move-controls" aria-label="Move selected figure">
            <button type="button" disabled={!selected} onClick={() => moveSelected(-12, 0)} aria-label="Move left"><ArrowLeft /></button>
            <button type="button" disabled={!selected} onClick={() => moveSelected(0, -12)} aria-label="Move up"><ArrowUp /></button>
            <button type="button" disabled={!selected} onClick={() => moveSelected(0, 12)} aria-label="Move down"><ArrowDown /></button>
            <button type="button" disabled={!selected} onClick={() => moveSelected(12, 0)} aria-label="Move right"><ArrowRight /></button>
          </div>
          <button type="button" disabled={!selected} onClick={() => resizeSelected(0.88)}><Minus size={19} /> Smaller</button>
          <button type="button" disabled={!selected} onClick={() => resizeSelected(1.14)}><Plus size={19} /> Bigger</button>
          <button type="button" disabled={!selected} onClick={duplicateSelected}><Copy size={18} /> Copy</button>
          <button type="button" disabled={!selected} onClick={deleteSelected}><Trash2 size={18} /> Delete</button>
          <button type="button" className="clear-button" onClick={clearDrawing} disabled={!shapes.length}><RotateCcw size={18} /> Start again</button>
        </div>

        <div className="guided-canvas-wrap">
          <svg
            ref={canvasRef}
            className="guided-canvas"
            viewBox="0 0 880 500"
            role="application"
            aria-label="Shape building canvas. Select and drag geometric figures."
            onPointerDown={() => setSelectedId(null)}
            onPointerMove={movePointer}
            onPointerUp={stopPointer}
            onPointerCancel={stopPointer}
          >
            <defs>
              <pattern id="shape-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e3e7f0" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="880" height="500" fill="url(#shape-grid)" />
            {shapes.map((shape) => (
              <g
                key={shape.id}
                className={`placed-shape ${selectedId === shape.id ? "selected" : ""}`}
                onPointerDown={(event) => startDrag(event, shape)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(shape.id);
                    setMessage(`${SHAPES.find((item) => item.kind === shape.kind)?.label ?? "Figure"} selected.`);
                  }
                }}
                aria-label={`${SHAPES.find((item) => item.kind === shape.kind)?.label ?? "Figure"}. Select and drag to move.`}
              >
                {renderShape(shape)}
                {selectedId === shape.id && (
                  <rect
                    x={shape.x - shape.width / 2 - 10}
                    y={shape.y - shape.height / 2 - 10}
                    width={shape.width + 20}
                    height={shape.height + 20}
                    rx="8"
                    className="shape-selection"
                    pointerEvents="none"
                  />
                )}
              </g>
            ))}
            {!shapes.length && (
              <g className="empty-canvas-message" pointerEvents="none">
                <circle cx="440" cy="206" r="42" fill="#e8edff" />
                <rect x="397" y="253" width="86" height="65" rx="10" fill="#fff3bd" stroke="#9ba9ce" strokeWidth="3" />
                <text x="440" y="357" textAnchor="middle">Choose a figure on the left.</text>
              </g>
            )}
          </svg>
          <div className="shape-status" aria-live="polite">{message}</div>
        </div>
      </main>

      <aside className="guided-coach" aria-label="Guided challenge coach">
        <p className="eyebrow">Your challenge</p>
        <h2>Build a friendly robot</h2>
        <RobotExample />
        <p className="example-note">This is an example, not a tracing task. Make your own robot.</p>

        <div className="guided-checklist" aria-label={`${completedCount} of 4 challenge goals complete`}>
          <div className={checks[0] ? "done" : ""}><span>{checks[0] ? <Check /> : "1"}</span><p><strong>8 figures</strong>Add enough parts.</p></div>
          <div className={checks[1] ? "done" : ""}><span>{checks[1] ? <Check /> : "2"}</span><p><strong>3 figure types</strong>Mix shapes.</p></div>
          <div className={checks[2] ? "done" : ""}><span>{checks[2] ? <Check /> : "3"}</span><p><strong>3 fill colors</strong>Color inside.</p></div>
          <div className={checks[3] ? "done" : ""}><span>{checks[3] ? <Check /> : "4"}</span><p><strong>2 outline styles</strong>Change color and thickness.</p></div>
        </div>

        <button className="guided-download" type="button" disabled={!complete} onClick={() => downloadDrawing(shapes)}>
          <Download size={20} aria-hidden="true" />
          Download my drawing
        </button>
        {!complete && <p className="download-help">Finish the four goals to unlock the download.</p>}
      </aside>
    </div>
  );
}
