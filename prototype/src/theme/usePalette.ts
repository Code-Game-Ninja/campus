import { colors } from '../../packages/tokens/src';
import { useAppStore } from '@/store/useAppStore';

export function usePalette() {
  const dark = useAppStore((s) => s.darkMode);
  return dark ? {
    dark, canvas: colors.darkCanvas, surface: colors.darkSurface, sunken: '#0F1522', ink: '#F2F4F7',
    text: '#D0D5DD', muted: '#98A2B3', line: '#263145', brand: '#6D8BFF', brandSoft: '#17234A',
    infoSoft: '#17234A',
    danger: '#F97066', dangerSoft: '#3B1718', success: '#47CD89', successSoft: '#143527', warning: '#FDB022', warningSoft: '#3B2A0D',
  } : {
    dark, canvas: colors.sunken, surface: colors.surface, sunken: colors.sunken, ink: colors.ink,
    text: colors.text, muted: colors.muted, line: colors.line, brand: colors.brand, brandSoft: colors.brandSoft,
    infoSoft: colors.brandSoft,
    danger: colors.danger, dangerSoft: colors.dangerSoft, success: colors.success, successSoft: colors.successSoft,
    warning: colors.warning, warningSoft: colors.warningSoft,
  };
}
