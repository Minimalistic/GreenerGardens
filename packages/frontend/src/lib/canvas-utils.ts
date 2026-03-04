export const PLOT_COLORS: Record<string, string> = {
  raised_bed: '#4A7C59',
  in_ground: '#8B6914',
  container: '#D4956A',
  greenhouse: '#87CEEB',
  vertical: '#3D5A3E',
  hydroponic: '#6CB4EE',
  other: '#999',
};

export function snapTo(value: number, grid: number) {
  return Math.round(value / grid) * grid;
}

export function clampScale(min: number, max: number, s: number) {
  return Math.min(max, Math.max(min, s));
}
