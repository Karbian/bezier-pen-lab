import {
  Check,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Layers3,
  Lightbulb,
  LockKeyhole,
  PenTool,
  Redo2,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  STAGES,
  type BuildStage,
  type DrawingSpec,
  type Point,
  type Stage,
} from "./pen-data";
import { canStartPointer, clientToCanvas, handlePositions } from "./pen-input";

type Anchor = { x: number; y: number; in: Point; out: Point };
type Work = { points: Anchor[]; closed: boolean; finished: boolean };
type Result = {
  workKey: string;
  accuracy: number;
  efficiency: number;
  score: number;
  passed: boolean;
};
type DragState =
  | { type: "new-handle"; index: number; pointerId: number }
  | { type: "anchor"; index: number; pointerId: number; start: Point; origin: Anchor }
  | { type: "handle"; index: number; handle: "in" | "out"; pointerId: number }
  | null;

const EMPTY_WORK: Work = { points: [], closed: false, finished: false };
const PASS_SCORE = 70;
const VIEWBOX = { width: 880, height: 500 };

function cloneWork(work: Work): Work {
  return {
    closed: work.closed,
    finished: work.finished ?? work.closed,
    points: work.points.map((point) => ({
      ...point,
      in: { ...point.in },
      out: { ...point.out },
    })),
  };
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function workToPath(work: Work) {
  const points = work.points;
  if (!points.length) return "";
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  const addSegment = (previous: Anchor, current: Anchor) => {
    const curved =
      distance(previous, previous.out) > 0.5 || distance(current, current.in) > 0.5;
    return curved
      ? ` C ${previous.out.x.toFixed(1)} ${previous.out.y.toFixed(1)} ${current.in.x.toFixed(1)} ${current.in.y.toFixed(1)} ${current.x.toFixed(1)} ${current.y.toFixed(1)}`
      : ` L ${current.x.toFixed(1)} ${current.y.toFixed(1)}`;
  };
  for (let index = 1; index < points.length; index += 1) {
    path += addSegment(points[index - 1], points[index]);
  }
  if (work.closed && points.length > 2) {
    path += addSegment(points[points.length - 1], points[0]);
    path += " Z";
  }
  return path;
}

function getSpec(stage: Stage, partIndex: number): DrawingSpec {
  if (stage.kind === "build") return stage.parts[partIndex] ?? stage.parts[0];
  return {
    id: stage.id,
    name: stage.shortTitle,
    target: stage.target,
    budget: stage.budget,
    hints: stage.hints,
    closed: true,
    fill: "#ff765f",
    stroke: "#ff765f",
    instruction: stage.instruction,
  };
}

function getWorkKey(stage: Stage, spec: DrawingSpec) {
  return stage.kind === "build" ? `${stage.id}:${spec.id}` : stage.id;
}

function partKey(stage: BuildStage, part: DrawingSpec) {
  return `${stage.id}:${part.id}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeParts, setActiveParts] = useState<Record<string, number>>({});
  const [works, setWorks] = useState<Record<string, Work>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<Record<string, Work[]>>({});
  const [future, setFuture] = useState<Record<string, Work[]>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [showHint, setShowHint] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [constrainAngles, setConstrainAngles] = useState(false);
  const [independentHandles, setIndependentHandles] = useState(false);
  const [lastResult, setLastResult] = useState<Result | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentGroup, setStudentGroup] = useState("");
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const targetPathRef = useRef<SVGPathElement | null>(null);
  const studentPathRef = useRef<SVGPathElement | null>(null);

  const stage = STAGES[currentIndex] ?? STAGES[0];
  const activePartIndex =
    stage.kind === "build" ? Math.min(activeParts[stage.id] ?? 0, stage.parts.length - 1) : 0;
  const spec = useMemo(
    () => getSpec(stage, activePartIndex),
    [activePartIndex, stage],
  );
  const workKey = getWorkKey(stage, spec);
  const work = works[workKey] ?? EMPTY_WORK;
  const pathData = workToPath(work);
  const stageHistory = history[workKey] ?? [];
  const stageFuture = future[workKey] ?? [];
  const result = lastResult?.workKey === workKey ? lastResult : null;
  const readyToCheck = spec.closed ? work.closed : work.finished;
  const minimumPoints = spec.closed ? 3 : 2;

  const isStageComplete = useCallback(
    (item: Stage) =>
      item.kind === "practice"
        ? (scores[item.id] ?? 0) >= PASS_SCORE
        : item.parts.every((part) => (scores[partKey(item, part)] ?? 0) >= PASS_SCORE),
    [scores],
  );

  const stageScore = useCallback(
    (item: Stage) => {
      if (item.kind === "practice") return scores[item.id] ?? 0;
      const values = item.parts.map((part) => scores[partKey(item, part)] ?? 0);
      if (!values.length || values.some((value) => value < PASS_SCORE)) return 0;
      return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    },
    [scores],
  );

  const completedCount = STAGES.filter(isStageComplete).length;
  const progress = Math.round((completedCount / STAGES.length) * 100);
  const partsCompleted =
    stage.kind === "build"
      ? stage.parts.filter((part) => (scores[partKey(stage, part)] ?? 0) >= PASS_SCORE).length
      : 0;
  const stageComplete = isStageComplete(stage);

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem("bezier-pen-lab-v2") ??
        localStorage.getItem("bezier-pen-lab-v1");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.works) {
          const restored = Object.fromEntries(
            Object.entries(data.works as Record<string, Work>).map(([key, value]) => [
              key,
              { ...value, finished: value.finished ?? value.closed ?? false },
            ]),
          );
          setWorks(restored);
        }
        if (data.scores) setScores(data.scores);
        if (data.activeParts) setActiveParts(data.activeParts);
        if (typeof data.studentName === "string") setStudentName(data.studentName);
        if (typeof data.studentGroup === "string") setStudentGroup(data.studentGroup);
        if (data.reflections) setReflections(data.reflections);
        else if (typeof data.reflection === "string") {
          setReflections({ "logo-build": data.reflection });
        }
      }
    } catch {
      // A damaged local save should not prevent a student from starting again.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      "bezier-pen-lab-v2",
      JSON.stringify({
        works,
        scores,
        activeParts,
        studentName,
        studentGroup,
        reflections,
      }),
    );
  }, [activeParts, hydrated, reflections, scores, studentGroup, studentName, works]);

  const setWork = useCallback(
    (value: Work | ((previous: Work) => Work)) => {
      setWorks((previous) => {
        const current = previous[workKey] ?? EMPTY_WORK;
        const next = typeof value === "function" ? value(current) : value;
        return { ...previous, [workKey]: next };
      });
    },
    [workKey],
  );

  const invalidateScore = useCallback(() => {
    setScores((previous) => {
      if (!(workKey in previous)) return previous;
      const next = { ...previous };
      delete next[workKey];
      return next;
    });
    setLastResult(null);
  }, [workKey]);

  const pushHistory = useCallback(
    (snapshot = work) => {
      setHistory((previous) => ({
        ...previous,
        [workKey]: [...(previous[workKey] ?? []), cloneWork(snapshot)].slice(-40),
      }));
      setFuture((previous) => ({ ...previous, [workKey]: [] }));
    },
    [work, workKey],
  );

  const pointFromEvent = useCallback((event: ReactPointerEvent<SVGElement>) => {
    return clientToCanvas(
      { x: event.clientX, y: event.clientY },
      svgRef.current?.getScreenCTM() ?? null,
    );
  }, []);

  const undo = useCallback(() => {
    if (!stageHistory.length) return;
    const previousWork = stageHistory[stageHistory.length - 1];
    setHistory((all) => ({ ...all, [workKey]: stageHistory.slice(0, -1) }));
    setFuture((all) => ({
      ...all,
      [workKey]: [cloneWork(work), ...(all[workKey] ?? [])].slice(0, 40),
    }));
    setWork(cloneWork(previousWork));
    setSelected(null);
    invalidateScore();
  }, [invalidateScore, setWork, stageHistory, work, workKey]);

  const redo = useCallback(() => {
    if (!stageFuture.length) return;
    const nextWork = stageFuture[0];
    setHistory((all) => ({
      ...all,
      [workKey]: [...(all[workKey] ?? []), cloneWork(work)].slice(-40),
    }));
    setFuture((all) => ({ ...all, [workKey]: stageFuture.slice(1) }));
    setWork(cloneWork(nextWork));
    setSelected(null);
    invalidateScore();
  }, [invalidateScore, setWork, stageFuture, work, workKey]);

  const deleteSelected = useCallback(() => {
    if (selected === null || !work.points[selected]) return;
    pushHistory();
    setWork((previous) => {
      const points = previous.points.filter((_, index) => index !== selected);
      return {
        points,
        closed: previous.closed && points.length >= 3,
        finished: false,
      };
    });
    setSelected(null);
    invalidateScore();
  }, [invalidateScore, pushHistory, selected, setWork, work.points]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches("input, textarea, select")) return;
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      } else if (event.key === "Escape") {
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, redo, undo]);

  const startCanvasPoint = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (work.finished || !canStartPointer(event, activePointerId.current)) return;
    const point = pointFromEvent(event);
    if (
      !point || point.x < 0 || point.x > VIEWBOX.width ||
      point.y < 0 || point.y > VIEWBOX.height
    ) return;
    event.preventDefault();
    activePointerId.current = event.pointerId;
    pushHistory();
    invalidateScore();
    const nextAnchor: Anchor = {
      x: point.x,
      y: point.y,
      in: { ...point },
      out: { ...point },
    };
    const index = work.points.length;
    setWork((previous) => ({ ...previous, points: [...previous.points, nextAnchor] }));
    setSelected(index);
    setDrag({ type: "new-handle", index, pointerId: event.pointerId });
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const startAnchorDrag = (
    event: ReactPointerEvent<SVGCircleElement>,
    index: number,
  ) => {
    event.stopPropagation();
    if (!canStartPointer(event, activePointerId.current)) return;
    const start = pointFromEvent(event);
    if (!start) return;
    event.preventDefault();
    if (index === 0 && spec.closed && !work.finished && work.points.length >= 3) {
      pushHistory();
      setWork((previous) => ({ ...previous, closed: true, finished: true }));
      setSelected(0);
      invalidateScore();
      return;
    }
    const origin = work.points[index];
    if (!origin) return;
    activePointerId.current = event.pointerId;
    pushHistory();
    invalidateScore();
    setSelected(index);
    setDrag({
      type: "anchor",
      index,
      pointerId: event.pointerId,
      start,
      origin: cloneWork({ points: [origin], closed: false, finished: false }).points[0],
    });
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const startHandleDrag = (
    event: ReactPointerEvent<SVGCircleElement>,
    index: number,
    handle: "in" | "out",
  ) => {
    event.stopPropagation();
    if (!canStartPointer(event, activePointerId.current)) return;
    event.preventDefault();
    activePointerId.current = event.pointerId;
    pushHistory();
    invalidateScore();
    setSelected(index);
    setDrag({ type: "handle", index, handle, pointerId: event.pointerId });
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const movePointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const pointer = pointFromEvent(event);
    if (!pointer) return;
    setWork((previous) => {
      const points = previous.points.map((item) => ({
        ...item,
        in: { ...item.in },
        out: { ...item.out },
      }));
      const anchor = points[drag.index];
      if (!anchor) return previous;

      if (drag.type === "new-handle") {
        // Creating a smooth point still makes a pair; independence edits one side afterward.
        Object.assign(anchor, handlePositions(
          anchor, pointer, "out", constrainAngles || event.shiftKey, false,
        ));
      } else if (drag.type === "anchor") {
        const dx = pointer.x - drag.start.x;
        const dy = pointer.y - drag.start.y;
        anchor.x = drag.origin.x + dx;
        anchor.y = drag.origin.y + dy;
        anchor.in = { x: drag.origin.in.x + dx, y: drag.origin.in.y + dy };
        anchor.out = { x: drag.origin.out.x + dx, y: drag.origin.out.y + dy };
      } else {
        Object.assign(anchor, handlePositions(
          anchor, pointer, drag.handle,
          constrainAngles || event.shiftKey,
          independentHandles || event.altKey,
        ));
      }
      return { ...previous, points };
    });
  };

  const stopPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    activePointerId.current = null;
    setDrag(null);
    if (svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const finishPath = () => {
    if (work.points.length < minimumPoints || work.finished) return;
    pushHistory();
    invalidateScore();
    setWork((previous) => ({
      ...previous,
      closed: spec.closed,
      finished: true,
    }));
  };

  const resetPath = () => {
    if (!work.points.length) return;
    pushHistory();
    setWork(EMPTY_WORK);
    setSelected(null);
    invalidateScore();
  };

  const checkWork = () => {
    const target = targetPathRef.current;
    const student = studentPathRef.current;
    if (!target || !student || !readyToCheck || work.points.length < minimumPoints) return;

    const sample = (path: SVGPathElement, count: number) => {
      const length = path.getTotalLength();
      return Array.from({ length: count }, (_, index) =>
        path.getPointAtLength((length * index) / Math.max(1, count - 1)),
      );
    };
    const targetPoints = sample(target, 120);
    const studentPoints = sample(student, 120);
    const averageNearest = (from: DOMPoint[], to: DOMPoint[]) =>
      from.reduce((sum, item) => {
        const nearest = to.reduce(
          (best, candidate) =>
            Math.min(best, Math.hypot(item.x - candidate.x, item.y - candidate.y)),
          Number.POSITIVE_INFINITY,
        );
        return sum + nearest;
      }, 0) / from.length;

    const shapeDistance =
      (averageNearest(studentPoints, targetPoints) +
        averageNearest(targetPoints, studentPoints)) /
      2;
    const accuracy = Math.max(
      0,
      Math.min(100, Math.round(100 - shapeDistance * 2.15)),
    );
    const extraNodes = Math.max(0, work.points.length - spec.budget);
    const efficiency = Math.max(30, 100 - extraNodes * 14);
    const score = Math.round(accuracy * 0.78 + efficiency * 0.22);
    const passed = score >= PASS_SCORE && accuracy >= 65;
    const checked: Result = { workKey, accuracy, efficiency, score, passed };
    setLastResult(checked);
    if (passed) {
      setScores((previous) => ({
        ...previous,
        [workKey]: Math.max(previous[workKey] ?? 0, score),
      }));
    }
  };

  const isUnlocked = (index: number) =>
    index === 0 || isStageComplete(STAGES[index - 1]);

  const isPartUnlocked = (item: BuildStage, index: number) =>
    index === 0 || (scores[partKey(item, item.parts[index - 1])] ?? 0) >= PASS_SCORE;

  const selectPart = (index: number) => {
    if (stage.kind !== "build" || !isPartUnlocked(stage, index)) return;
    setActiveParts((previous) => ({ ...previous, [stage.id]: index }));
    setSelected(null);
    setShowHint(false);
    setLastResult(null);
  };

  const goToStage = (index: number) => {
    if (!isUnlocked(index)) return;
    setCurrentIndex(index);
    setSelected(null);
    setShowHint(false);
    setLastResult(null);
  };

  const advance = () => {
    if (stage.kind === "build") {
      const nextPart = stage.parts.findIndex(
        (part, index) =>
          index > activePartIndex && (scores[partKey(stage, part)] ?? 0) < PASS_SCORE,
      );
      if (nextPart >= 0) {
        selectPart(nextPart);
        return;
      }
    }
    const nextStage = Math.min(currentIndex + 1, STAGES.length - 1);
    if (nextStage !== currentIndex) goToStage(nextStage);
  };

  const artworkPaths = (item: BuildStage) =>
    item.parts
      .map((part) => {
        const data = workToPath(works[partKey(item, part)] ?? EMPTY_WORK);
        if (!data) return "";
        const width = part.strokeWidth ?? (part.fill === "none" ? 4 : 2);
        return `  <path d="${data}" fill="${part.fill}" stroke="${part.stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
      })
      .filter(Boolean)
      .join("\n");

  const exportArtwork = () => {
    if (stage.kind !== "build" || !stageComplete) return;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 500" role="img" aria-labelledby="title">
  <title id="title">${escapeXml(stage.artifactName)} student vector artwork</title>
${artworkPaths(stage)}
</svg>`;
    downloadText(
      `${safeFileName(stage.artifactName)}.svg`,
      svg,
      "image/svg+xml",
    );
  };

  const reflection = stage.kind === "build" ? reflections[stage.id] ?? "" : "";

  const exportEvidence = () => {
    if (
      stage.kind !== "build" ||
      !stageComplete ||
      !studentName.trim() ||
      !reflection.trim()
    ) {
      return;
    }
    const overall = stageScore(stage);
    const safeReflection = reflection.trim().slice(0, 220);
    const paths = artworkPaths(stage);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(stage.challengeLabel)} — ${escapeXml(studentName.trim())}</title>
  <desc id="desc">${escapeXml(safeReflection)}</desc>
  <rect width="1200" height="800" fill="#f4f6fb"/>
  <rect width="1200" height="94" fill="#111936"/>
  <rect y="90" width="1200" height="4" fill="#ffdd57"/>
  <text x="64" y="59" fill="#ffffff" font-family="Arial, sans-serif" font-size="30" font-weight="700">Bézier Pen Lab · Evidence of Learning</text>
  <rect x="64" y="138" width="702" height="552" rx="18" fill="#ffffff" stroke="#d9deea"/>
  <g transform="translate(40 212) scale(.75)">
${paths}
  </g>
  <rect x="798" y="138" width="338" height="552" rx="18" fill="#ffffff" stroke="#d9deea"/>
  <text x="834" y="194" fill="#65708b" font-family="Arial, sans-serif" font-size="15" font-weight="700">STUDENT</text>
  <text x="834" y="227" fill="#111936" font-family="Arial, sans-serif" font-size="25" font-weight="700">${escapeXml(studentName.trim())}</text>
  <text x="834" y="264" fill="#4e5b79" font-family="Arial, sans-serif" font-size="17">${escapeXml(studentGroup.trim() || "Group not entered")}</text>
  <line x1="834" y1="292" x2="1100" y2="292" stroke="#d9deea"/>
  <text x="834" y="334" fill="#65708b" font-family="Arial, sans-serif" font-size="15" font-weight="700">CHALLENGE</text>
  <text x="834" y="367" fill="#111936" font-family="Arial, sans-serif" font-size="21" font-weight="700">${escapeXml(stage.artifactName)}</text>
  <text x="834" y="438" fill="#315ee7" font-family="Arial, sans-serif" font-size="58" font-weight="800">${overall}</text>
  <text x="917" y="432" fill="#65708b" font-family="Arial, sans-serif" font-size="17">average score</text>
  <text x="834" y="478" fill="#4e5b79" font-family="Arial, sans-serif" font-size="16">${stage.parts.length} separate paths assembled</text>
  <text x="834" y="535" fill="#65708b" font-family="Arial, sans-serif" font-size="15" font-weight="700">REFLECTION</text>
  <foreignObject x="834" y="550" width="266" height="105">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font: 15px/1.45 Arial, sans-serif; color:#4e5b79;">${escapeXml(safeReflection)}</div>
  </foreignObject>
  <text x="64" y="754" fill="#65708b" font-family="Arial, sans-serif" font-size="15">Created with separate editable vector paths, Bézier handles and deliberate layer order.</text>
</svg>`;
    downloadText(
      `${safeFileName(stage.artifactName)}-evidence-${safeFileName(studentName)}.svg`,
      svg,
      "image/svg+xml",
    );
  };

  const buildLayers = stage.kind === "build" ? stage.parts : [];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1>Bézier Pen Lab</h1>
            <p>Vector drawing practice · Grade 8</p>
          </div>
        </div>
        <div
          className="progress-pill"
          aria-label={`${completedCount} of ${STAGES.length} stages complete`}
        >
          <div className="progress-copy">
            <span>Course progress</span>
            <span>{completedCount}/{STAGES.length}</span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <div className="workspace">
        <nav className="stage-rail" aria-label="Pen tool exercises">
          <p className="rail-label">Learning path</p>
          <div className="stage-list">
            {STAGES.map((item, index) => {
              const unlocked = isUnlocked(index);
              const complete = isStageComplete(item);
              const score = stageScore(item);
              const buildProgress =
                item.kind === "build"
                  ? `${item.parts.filter((part) => (scores[partKey(item, part)] ?? 0) >= PASS_SCORE).length}/${item.parts.length}`
                  : "";
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`stage-button ${index === currentIndex ? "active" : ""} ${complete ? "complete" : ""} ${!unlocked ? "locked" : ""}`}
                  onClick={() => goToStage(index)}
                  aria-current={index === currentIndex ? "step" : undefined}
                  aria-label={`${item.shortTitle}${!unlocked ? ", locked" : ""}`}
                >
                  <span className="stage-number">
                    {complete ? <Check size={16} /> : index + 1}
                  </span>
                  <span>
                    <span className="stage-name">{item.shortTitle}</span>
                    <span className="stage-skill">
                      {item.kind === "build" && !complete ? buildProgress : item.skill}
                    </span>
                  </span>
                  <span className="status-icon" aria-hidden="true">
                    {!unlocked ? <LockKeyhole size={14} /> : complete ? score : "›"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="rail-note">
            Your best scores, layers and unfinished paths are saved automatically on this device.
          </div>
        </nav>

        <main className="studio">
          {stage.kind === "build" && (
            <div className="evidence-banner">
              <span>{stage.challengeLabel}: assemble every separate path.</span>
              <span>{partsCompleted}/{stage.parts.length} layers</span>
            </div>
          )}
          <div className="exercise-head">
            <div>
              <h2>{stage.title}</h2>
              <p>
                {stage.kind === "build" ? (
                  <>
                    <strong>{spec.name}:</strong> {spec.instruction}
                  </>
                ) : (
                  stage.instruction
                )}
              </p>
            </div>
            <div className="budget">
              Node budget
              <strong>{work.points.length} / {spec.budget}</strong>
            </div>
          </div>

          <div className="handle-controls" role="group" aria-label="Handle controls" aria-describedby="handle-controls-help">
            <button
              className="handle-mode"
              type="button"
              aria-pressed={constrainAngles}
              onClick={() => setConstrainAngles((value) => !value)}
            >
              Snap angles (45°) <span>{constrainAngles ? "On" : "Off"}</span>
            </button>
            <button
              className="handle-mode"
              type="button"
              aria-pressed={independentHandles}
              onClick={() => setIndependentHandles((value) => !value)}
            >
              Independent handles <span>{independentHandles ? "On" : "Off"}</span>
            </button>
            <p id="handle-controls-help">
              Snap angles locks handle directions to 45° steps. Independent handles lets
              you adjust one existing handle without moving the other. Keyboard: Shift / Alt (Option).
            </p>
          </div>

          <div className="toolbar" role="toolbar" aria-label="Drawing tools">
            <button className="tool-button active" type="button" aria-pressed="true" title="Pen tool">
              <PenTool size={17} />
              <span className="tool-label">Pen</span>
            </button>
            <span className="tool-divider" aria-hidden="true" />
            <button className="tool-button" type="button" onClick={undo} disabled={!stageHistory.length} title="Undo">
              <Undo2 size={17} />
              <span className="tool-label">Undo</span>
            </button>
            <button className="tool-button" type="button" onClick={redo} disabled={!stageFuture.length} title="Redo">
              <Redo2 size={17} />
              <span className="tool-label">Redo</span>
            </button>
            <button className="tool-button" type="button" onClick={deleteSelected} disabled={selected === null} title="Delete selected anchor">
              <Trash2 size={17} />
              <span className="tool-label">Delete</span>
            </button>
            <button className="tool-button" type="button" onClick={resetPath} disabled={!work.points.length} title="Reset active path">
              <RotateCcw size={17} />
              <span className="tool-label">Reset path</span>
            </button>
            <span className="tool-divider" aria-hidden="true" />
            <button className={`tool-button ${showHint ? "active" : ""}`} type="button" onClick={() => setShowHint((value) => !value)} aria-pressed={showHint}>
              <Lightbulb size={17} />
              <span className="tool-label">Hint</span>
            </button>
            <button className={`tool-button ${showGuide ? "active" : ""}`} type="button" onClick={() => setShowGuide((value) => !value)} aria-pressed={showGuide}>
              {showGuide ? <Eye size={17} /> : <EyeOff size={17} />}
              <span className="tool-label">Guide</span>
            </button>
            <button className="tool-button" type="button" onClick={finishPath} disabled={work.finished || work.points.length < minimumPoints}>
              <span aria-hidden="true">{spec.closed ? "◇" : "•—"}</span>
              <span className="tool-label">{spec.closed ? "Close path" : "Finish stroke"}</span>
            </button>
            <button className="tool-button check" type="button" onClick={checkWork} disabled={!readyToCheck || work.points.length < minimumPoints}>
              <Check size={17} />
              Check
            </button>
          </div>

          <div className="canvas-wrap">
            <svg
              ref={svgRef}
              className="drawing-canvas"
              viewBox="0 0 880 500"
              role="application"
              aria-label="Interactive vector drawing canvas"
              onPointerDown={startCanvasPoint}
              onPointerMove={movePointer}
              onPointerUp={stopPointer}
              onPointerCancel={stopPointer}
              onLostPointerCapture={stopPointer}
            >
              <defs>
                <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#dbe1ef" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="880" height="500" className="canvas-grid" />

              {stage.kind === "build" &&
                buildLayers.map((part, index) => {
                  if (index === activePartIndex) return null;
                  const key = partKey(stage, part);
                  const completed = (scores[key] ?? 0) >= PASS_SCORE;
                  const completedPath = workToPath(works[key] ?? EMPTY_WORK);
                  if (completed && completedPath) {
                    return (
                      <path
                        key={part.id}
                        d={completedPath}
                        fill={part.fill}
                        stroke={part.stroke}
                        strokeWidth={part.strokeWidth ?? (part.fill === "none" ? 4 : 2)}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pointerEvents="none"
                      />
                    );
                  }
                  if (!showGuide) return null;
                  return (
                    <path
                      key={part.id}
                      d={part.target}
                      fill={part.closed ? part.fill : "none"}
                      fillOpacity={part.closed ? 0.045 : 0}
                      stroke="#aeb7cb"
                      strokeOpacity={0.32}
                      strokeWidth={part.strokeWidth ?? 3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                  );
                })}

              {showGuide ? (
                <>
                  <path
                    ref={targetPathRef}
                    d={spec.target}
                    className="target-path"
                    style={{ fill: spec.closed ? `${spec.fill}16` : "none" }}
                  />
                  <path d={spec.target} className="target-centerline" />
                </>
              ) : (
                <path ref={targetPathRef} d={spec.target} fill="none" stroke="transparent" pointerEvents="none" />
              )}

              {showHint &&
                spec.hints.map((hint, index) => (
                  <g key={`${hint.x}-${hint.y}-${index}`} pointerEvents="none">
                    <circle cx={hint.x} cy={hint.y} r="12" fill="#ffdd57" opacity=".4" />
                    <circle cx={hint.x} cy={hint.y} r="4" fill="#173998" />
                  </g>
                ))}

              {pathData && (
                <path
                  ref={studentPathRef}
                  d={pathData}
                  className="student-path"
                  style={{
                    fill: work.closed ? spec.fill : "none",
                    fillOpacity: work.closed ? 0.62 : 0,
                    stroke: result?.passed ? spec.stroke : "#ff6e5f",
                    strokeWidth: spec.strokeWidth ?? 4,
                  }}
                />
              )}

              {work.points.map((point, index) => {
                const hasIn = distance(point, point.in) > 0.5;
                const hasOut = distance(point, point.out) > 0.5;
                const visibleHandles = selected === index || drag?.index === index;
                return (
                  <g key={index}>
                    {visibleHandles && hasIn && (
                      <>
                        <line x1={point.x} y1={point.y} x2={point.in.x} y2={point.in.y} className="handle-line" />
                        <circle
                          cx={point.in.x}
                          cy={point.in.y}
                          r="6"
                          className="handle"
                          onPointerDown={(event) => startHandleDrag(event, index, "in")}
                        />
                      </>
                    )}
                    {visibleHandles && hasOut && (
                      <>
                        <line x1={point.x} y1={point.y} x2={point.out.x} y2={point.out.y} className="handle-line" />
                        <circle
                          cx={point.out.x}
                          cy={point.out.y}
                          r="6"
                          className="handle"
                          onPointerDown={(event) => startHandleDrag(event, index, "out")}
                        />
                      </>
                    )}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="7"
                      className={`anchor ${selected === index ? "selected" : ""} ${index === 0 && spec.closed && !work.finished ? "start" : ""}`}
                      onPointerDown={(event) => startAnchorDrag(event, index)}
                    />
                  </g>
                );
              })}
            </svg>
            <div className="canvas-tip">
              {!work.points.length
                ? "Start on a highlighted anchor: tap or click for a corner; press and drag for a curve."
                : work.finished
                  ? "Path finished. Select anchors or handles to refine it, then press Check."
                  : spec.closed
                    ? "Continue around the outline. Tap the green first anchor or use Close path to finish."
                    : "Follow the open guide from one end to the other, then choose Finish stroke."}
            </div>
          </div>
        </main>

        <aside className="coach-panel" aria-label="Pen tool coach">
          <p className="eyebrow">Studio coach</p>
          <h3>{result ? "Your feedback" : "What to focus on"}</h3>

          {result ? (
            <div className={`coach-card ${result.passed ? "success" : "warning"}`} aria-live="polite">
              <div className="score-line">
                <div>
                  <div className="score-value">{result.score}</div>
                  <div className="score-label">path score</div>
                </div>
                <strong>{result.passed ? "Path accepted" : "Refine and retry"}</strong>
              </div>
              <div className="metric-grid">
                <div className="metric">
                  <strong>{result.accuracy}%</strong>
                  <span>shape accuracy</span>
                </div>
                <div className="metric">
                  <strong>{result.efficiency}%</strong>
                  <span>node efficiency</span>
                </div>
              </div>
              <p style={{ marginTop: ".7rem" }}>
                {result.passed
                  ? work.points.length <= spec.budget
                    ? "Clean result: the path follows the guide and stays within the node budget."
                    : "Good match. Remove an anchor only if the path remains smooth and editable."
                  : result.accuracy < 65
                    ? "Move anchors toward the curve extremes and adjust handle length to follow the guide."
                    : "The outline is close. Smooth the remaining bumps or remove an unnecessary anchor."}
              </p>
              {result.passed && (!stageComplete || currentIndex < STAGES.length - 1) && (
                <button className="next-button" type="button" onClick={advance}>
                  {stage.kind === "build" && !stageComplete ? "Next layer" : "Next challenge"}
                  <ChevronRight size={16} style={{ display: "inline", verticalAlign: "middle" }} />
                </button>
              )}
            </div>
          ) : (
            <div className="coach-card accent">
              <h4>{stage.kind === "build" ? spec.name : stage.skill}</h4>
              <p>{stage.kind === "build" ? spec.instruction : stage.coaching}</p>
            </div>
          )}

          {stage.kind === "build" ? (
            <>
              <div className="coach-card layer-card">
                <h4>
                  <Layers3 size={16} aria-hidden="true" />
                  Separate paths
                </h4>
                <div className="part-list">
                  {stage.parts.map((part, index) => {
                    const key = partKey(stage, part);
                    const complete = (scores[key] ?? 0) >= PASS_SCORE;
                    const unlocked = isPartUnlocked(stage, index);
                    return (
                      <button
                        type="button"
                        key={part.id}
                        className={`part-button ${index === activePartIndex ? "active" : ""} ${complete ? "complete" : ""}`}
                        disabled={!unlocked}
                        onClick={() => selectPart(index)}
                      >
                        <span className="part-swatch" style={{ background: part.fill === "none" ? part.stroke : part.fill }} />
                        <span>{part.name}</span>
                        <span aria-hidden="true">
                          {complete ? <Check size={14} /> : !unlocked ? <LockKeyhole size={13} /> : scores[key] ?? ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {stage.referenceImage && (
                <div className="coach-card reference-card">
                  <h4>Reference from the supplied guide</h4>
                  <img
                    src={`${import.meta.env.BASE_URL}${stage.referenceImage}`}
                    alt={stage.referenceAlt ?? ""}
                  />
                  <p>Use it to check proportion, overlap, layer order and the yellow/white/brown/black palette.</p>
                </div>
              )}

              <div className="coach-card illustrator-card">
                <h4>Adobe Illustrator file</h4>
                <p>Open the editable SVG in Illustrator on the web to inspect the separate vector groups, colors and stacking order.</p>
                {stage.illustratorCloudUrl && (
                  <a
                    className="secondary-button asset-link"
                    href={stage.illustratorCloudUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <PenTool size={15} aria-hidden="true" />
                    Open shared Illustrator document
                  </a>
                )}
                <a
                  className="secondary-button asset-link"
                  href={`${import.meta.env.BASE_URL}${stage.illustratorAsset}`}
                  download
                >
                  <Download size={15} aria-hidden="true" />
                  Download editable SVG
                </a>
              </div>

              <div className="coach-card">
                <h4>Evidence details</h4>
                <div className="form-stack">
                  <label className="field-label">
                    Student name
                    <input className="student-field" value={studentName} onChange={(event) => setStudentName(event.target.value)} />
                  </label>
                  <label className="field-label">
                    Group
                    <input className="student-field" value={studentGroup} onChange={(event) => setStudentGroup(event.target.value)} placeholder="Example: 8B" />
                  </label>
                  <label className="field-label">
                    {stage.reflectionPrompt}
                    <textarea
                      className="reflection-field"
                      value={reflection}
                      onChange={(event) =>
                        setReflections((previous) => ({
                          ...previous,
                          [stage.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <button className="secondary-button" type="button" onClick={exportArtwork} disabled={!stageComplete}>
                  <Download size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
                  Download assembled SVG
                </button>
                <button
                  className="download-button"
                  type="button"
                  onClick={exportEvidence}
                  disabled={!stageComplete || !studentName.trim() || !reflection.trim()}
                >
                  <Download size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
                  Download evidence sheet
                </button>
              </div>

              <div className="coach-card">
                <h4>Assessment rubric · 20 points</h4>
                <div className="rubric">
                  <div className="rubric-row"><span>Accurate separate paths</span><strong>6</strong></div>
                  <div className="rubric-row"><span>Efficient, smooth anchors</span><strong>5</strong></div>
                  <div className="rubric-row"><span>Assembly and layer order</span><strong>5</strong></div>
                  <div className="rubric-row"><span>Reflection explains choices</span><strong>4</strong></div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="coach-card">
                <h4>Touch and keyboard controls</h4>
                <div className="shortcut-list">
                  <div className="shortcut-row"><span>Snap angles button</span><kbd>Shift</kbd></div>
                  <div className="shortcut-row"><span>Independent handles button</span><kbd>Alt</kbd></div>
                  <div className="shortcut-row"><span>Undo</span><kbd>Ctrl Z</kbd></div>
                  <div className="shortcut-row"><span>Delete anchor</span><kbd>Del</kbd></div>
                </div>
              </div>
              <div className="coach-card">
                <h4>Clean-path habit</h4>
                <ul>
                  <li>Place anchors at curve extremes.</li>
                  <li>Use handles before adding points.</li>
                  <li>Prefer editability over a misleading “fewest points” score.</li>
                </ul>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
