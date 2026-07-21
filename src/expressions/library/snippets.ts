export const EXPRESSION_SNIPPETS = [
  {
    label: 'Wiggle',
    code: 'wiggle(freq: 2, amp: 50)',
    description: 'Procedural random movement',
  },
  {
    label: 'Loop Out',
    code: 'loopOut("cycle")',
    description: 'Repeats keyframe animation',
  },
  {
    label: 'Bounce',
    code: `const amp = 0.1, freq = 3, decay = 5;
const n = nearestKeyframe(time);
const t = time - n.time;
if (t > 0) {
  return value + amp * Math.sin(t * freq * Math.PI * 2) / Math.exp(t * decay);
} else { return value; }`,
    description: 'Inertial bounce after keyframe',
  },
];
