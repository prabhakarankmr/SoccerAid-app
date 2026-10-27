import Svg, { Circle, Line, Rect } from 'react-native-svg';

const STROKE = '#ffffff';
const STROKE_WIDTH = 0.4;

/**
 * Static SVG pitch markings — one continuous pitch split by the halfway line, not two separate
 * pitches side by side (FootballPitch renders Team A on the right half, Team B on the left,
 * FRONTEND_INSTRUCTIONS.md §5.2). Coordinates are in a 0-100 x 0-62.5 viewBox (16:10 aspect,
 * §4) so they scale with the container regardless of actual pixel size.
 */
export function PitchMarkings() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 62.5" style={{ position: 'absolute' }}>
      <Rect
        x={0.5}
        y={0.5}
        width={99}
        height={61.5}
        fill="none"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
      />
      <Line x1={50} y1={0.5} x2={50} y2={62} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Circle cx={50} cy={31.25} r={9} fill="none" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Circle cx={50} cy={31.25} r={0.6} fill={STROKE} />

      {/* Left goal (Team B's own goal) */}
      <Rect
        x={0.5}
        y={17}
        width={14}
        height={28.5}
        fill="none"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
      />
      <Rect
        x={0.5}
        y={24}
        width={6}
        height={14.5}
        fill="none"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
      />
      <Rect x={-1} y={27.5} width={2} height={7.5} fill="#ffffff" />

      {/* Right goal (Team A's own goal) */}
      <Rect
        x={85.5}
        y={17}
        width={14}
        height={28.5}
        fill="none"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
      />
      <Rect
        x={93.5}
        y={24}
        width={6}
        height={14.5}
        fill="none"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
      />
      <Rect x={99} y={27.5} width={2} height={7.5} fill="#ffffff" />
    </Svg>
  );
}
