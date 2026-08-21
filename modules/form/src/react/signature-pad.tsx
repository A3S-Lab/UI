import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
} from 'react';
import {
  FORM_SIGNATURE_LIMITS,
  type FormSignaturePoint,
  type FormSignatureStroke,
  signaturePointCount,
} from './signature-contract';

const VIEWBOX_WIDTH = 1_000;
const VIEWBOX_HEIGHT = 320;
const MINIMUM_POINT_DISTANCE = 0.0015;

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function pointFromPointer(event: PointerEvent, element: SVGSVGElement): FormSignaturePoint {
  const bounds = element.getBoundingClientRect();
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  return {
    x: clamp((event.clientX - bounds.left) / width),
    y: clamp((event.clientY - bounds.top) / height),
    pressure: clamp(Number.isFinite(event.pressure) && event.pressure > 0 ? event.pressure : 0.5),
  };
}

function farEnough(previous: FormSignaturePoint | undefined, next: FormSignaturePoint): boolean {
  if (!previous) return true;
  return Math.hypot(previous.x - next.x, previous.y - next.y) >= MINIMUM_POINT_DISTANCE;
}

function appendPoints(
  strokes: readonly FormSignatureStroke[],
  points: readonly FormSignaturePoint[],
): FormSignatureStroke[] {
  if (strokes.length === 0 || points.length === 0) return [...strokes];
  const next = strokes.map((stroke) => ({ points: [...stroke.points] }));
  const active = next[next.length - 1];
  let remaining = FORM_SIGNATURE_LIMITS.maxPoints - signaturePointCount(next);
  for (const point of points) {
    if (remaining <= 0) break;
    const previous = active.points[active.points.length - 1];
    if (!farEnough(previous, point)) continue;
    active.points.push(point);
    remaining -= 1;
  }
  return next;
}

function signaturePath(strokes: readonly FormSignatureStroke[]): string {
  return strokes
    .flatMap((stroke) => {
      const [first, ...remaining] = stroke.points;
      if (!first) return [];
      const start = `M ${(first.x * VIEWBOX_WIDTH).toFixed(1)} ${(first.y * VIEWBOX_HEIGHT).toFixed(1)}`;
      if (remaining.length === 0) return [`${start} l 0.01 0`];
      return [
        `${start} ${remaining
          .map(
            (point) =>
              `L ${(point.x * VIEWBOX_WIDTH).toFixed(1)} ${(point.y * VIEWBOX_HEIGHT).toFixed(1)}`,
          )
          .join(' ')}`,
      ];
    })
    .join(' ');
}

export interface SignaturePadProps {
  strokes: readonly FormSignatureStroke[];
  onChange: (strokes: readonly FormSignatureStroke[]) => void;
  onUndo: () => void;
  disabled: boolean;
  label: string;
  describedBy?: string;
  penColor: 'ink' | 'blue';
}

export function SignaturePad({
  strokes,
  onChange,
  onUndo,
  disabled,
  label,
  describedBy,
  penColor,
}: SignaturePadProps) {
  const activePointer = useRef<number | 'fallback' | undefined>(undefined);
  const strokesRef = useRef(strokes);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  const commit = (next: readonly FormSignatureStroke[]) => {
    strokesRef.current = next;
    onChange(next);
  };

  const captureSamples = (
    event: ReactPointerEvent<SVGSVGElement>,
  ): readonly FormSignaturePoint[] => {
    const native = event.nativeEvent;
    const coalesced =
      typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const samples = coalesced.length > 0 ? coalesced : [native];
    return samples.map((sample) => pointFromPointer(sample, event.currentTarget));
  };

  const pointerIdentity = (event: ReactPointerEvent<SVGSVGElement>): number | 'fallback' =>
    Number.isFinite(event.pointerId) ? event.pointerId : 'fallback';

  const finishPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== pointerIdentity(event)) return;
    commit(appendPoints(strokesRef.current, captureSamples(event)));
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // The browser may release capture before the synthetic event reaches React.
    }
    activePointer.current = undefined;
  };

  return (
    <svg
      className="a3s-form-signature-pad"
      data-pen-color={penColor}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      aria-describedby={describedBy}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(event: ReactKeyboardEvent<SVGSVGElement>) => {
        if (disabled || (event.key !== 'Backspace' && event.key !== 'Delete')) return;
        event.preventDefault();
        onUndo();
      }}
      onPointerDown={(event) => {
        if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
        if (strokesRef.current.length >= FORM_SIGNATURE_LIMITS.maxStrokes) return;
        event.preventDefault();
        activePointer.current = pointerIdentity(event);
        try {
          event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
          // Pointer capture is optional in lightweight DOM implementations.
        }
        const point = pointFromPointer(event.nativeEvent, event.currentTarget);
        commit([...strokesRef.current, { points: [point] }]);
      }}
      onPointerMove={(event) => {
        if (disabled || activePointer.current !== pointerIdentity(event)) return;
        event.preventDefault();
        commit(appendPoints(strokesRef.current, captureSamples(event)));
      }}
      onPointerUp={finishPointer}
      onPointerCancel={(event) => {
        if (activePointer.current !== pointerIdentity(event)) return;
        const next = strokesRef.current.slice(0, -1);
        commit(next);
        activePointer.current = undefined;
      }}
      onLostPointerCapture={(event) => {
        if (activePointer.current === pointerIdentity(event)) activePointer.current = undefined;
      }}
    >
      <title>{label}</title>
      <line className="a3s-form-signature-guide" x1="58" x2="942" y1="260" y2="260" />
      <path
        className="a3s-form-signature-stroke"
        d={signaturePath(strokes)}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
