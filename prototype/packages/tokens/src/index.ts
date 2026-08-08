export const colors = {
  brand: '#375DFB', brandSoft: '#EBF0FF', ink: '#101828', text: '#344054', muted: '#667085',
  surface: '#FFFFFF', sunken: '#F6F7FB', line: '#EAECF0', danger: '#D92D20', dangerSoft: '#FEF3F2',
  success: '#079455', successSoft: '#ECFDF3', warning: '#DC6803', warningSoft: '#FFFAEB',
  teal: '#0E9384', tealSoft: '#F0FDF9', indigo: '#5925DC', darkCanvas: '#0B0F1A', darkSurface: '#111726',
  lavender: '#EEF0FF', coral: '#FFF0ED', mint: '#EAFBF4', sky: '#EAF7FF', yellow: '#FFF7D6',
} as const;

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 } as const;
export const radius = { field: 8, card: 12, sheet: 16, pill: 999 } as const;
export const shadow = { shadowColor: '#101828', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 } as const;
