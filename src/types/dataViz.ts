export type ChartType = 'pie' | 'bar' | 'line' | 'donut';

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartData {
  type: ChartType;
  points: DataPoint[];
  /** Animation progress 0-1 */
  progress: number;
  /** Gap between bars or slices */
  spacing: number;
  /** Inner radius for donut charts (0.0 - 1.0) */
  innerRadius: number;
  showLabels: boolean;
  fontSize: number;
  thickness: number; // for 3D or stroke width
}

export function defaultChartData(): ChartData {
  return {
    type: 'pie',
    points: [
      { label: 'A', value: 30, color: '#4772b3' },
      { label: 'B', value: 50, color: '#e25b4a' },
      { label: 'C', value: 20, color: '#4ae28a' },
    ],
    progress: 1,
    spacing: 0,
    innerRadius: 0.5,
    showLabels: true,
    fontSize: 12,
    thickness: 2,
  };
}