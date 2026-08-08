import { PropsWithChildren, ReactNode, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, Pressable, ScrollView, StyleProp, Switch, Text, TextInput, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { shadow } from '../../packages/tokens/src';
import { usePalette } from '@/theme/usePalette';
import { useAppStore } from '@/store/useAppStore';
import { getAvatarOption } from '@/data/avatarOptions';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  keyboardAvoiding?: boolean;
  keyboardVerticalOffset?: number;
}>;

export function Screen({ children, scroll = true, style, keyboardAvoiding = true, keyboardVerticalOffset = 0 }: ScreenProps) {
  const p = usePalette();
  const content = <View style={[{ flex: 1, paddingHorizontal: 16, paddingBottom: 116 }, style]}>{children}</View>;
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  ) : content;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.canvas }}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={keyboardVerticalOffset}
          style={{ flex: 1 }}
        >
          {body}
        </KeyboardAvoidingView>
      ) : body}
    </SafeAreaView>
  );
}

export function Heading({ children, size = 30 }: PropsWithChildren<{ size?: number }>) {
  const p = usePalette();
  return <Text style={{ color: p.ink, fontSize: size, lineHeight: size + 7, fontWeight: '800', letterSpacing: -0.8 }}>{children}</Text>;
}

export function Body({ children, muted = false, style }: PropsWithChildren<{ muted?: boolean; style?: object }>) {
  const p = usePalette();
  return <Text style={[{ color: muted ? p.muted : p.text, fontSize: 15, lineHeight: 22 }, style]}>{children}</Text>;
}

export function TopBar({ title, subtitle, left, right }: { title: string; subtitle?: string; left?: ReactNode; right?: ReactNode }) {
  const p = usePalette();
  return <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
    {left}
    <View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 20, fontWeight: '800' }}>{title}</Text>{subtitle ? <Text style={{ color: p.muted, marginTop: 2, fontSize: 12 }}>{subtitle}</Text> : null}</View>
    {right}
  </View>;
}

type ButtonProps = { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; loading?: boolean; compact?: boolean };
export function Button({ label, onPress, icon, variant = 'primary', disabled, loading, compact }: ButtonProps) {
  const p = usePalette();
  const bg = variant === 'primary' ? p.brand : variant === 'danger' ? p.danger : variant === 'secondary' ? p.brandSoft : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? '#FFFFFF' : variant === 'secondary' ? p.brand : p.text;
  return <Pressable disabled={disabled || loading} accessibilityRole="button" accessibilityLabel={label} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }} style={({ pressed }) => ({ minHeight: compact ? 40 : 50, opacity: disabled ? 0.45 : pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], backgroundColor: bg, borderRadius: 12, paddingHorizontal: compact ? 14 : 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: variant === 'ghost' ? 1 : 0, borderColor: p.line })}>
    {loading ? <ActivityIndicator color={fg} /> : <>{icon ? <Ionicons name={icon} size={18} color={fg} /> : null}<Text style={{ color: fg, fontSize: compact ? 13 : 15, fontWeight: '700' }}>{label}</Text></>}
  </Pressable>;
}

export function IconButton({ icon, label, onPress, active = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean }) {
  const p = usePalette();
  return <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? p.brandSoft : p.surface, borderWidth: 1, borderColor: active ? p.brand : p.line, opacity: pressed ? 0.7 : 1 })}><Ionicons name={icon} size={21} color={active ? p.brand : p.text} /></Pressable>;
}

export function Avatar({ initials, size = 42, accent = '#EBF0FF', avatarOptionId, avatarSeed }: { initials: string; size?: number; accent?: string; avatarOptionId?: string; avatarSeed?: string }) {
  const p = usePalette();
  const option = avatarOptionId ? getAvatarOption(avatarOptionId) : null;
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: p.line, overflow: 'hidden' }}>{option ? <Image source={{ uri: option.url(avatarSeed || initials) }} style={{ width: size, height: size }} resizeMode="cover" /> : <Text style={{ color: p.ink, fontSize: size * .32, fontWeight: '800' }}>{initials}</Text>}</View>;
}

export function Card({ children, style, onPress }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void }>) {
  const p = usePalette();
  const cardStyle: StyleProp<ViewStyle> = [{ backgroundColor: p.surface, borderRadius: 16, borderWidth: 1, borderColor: p.line, padding: 16, ...shadow }, style];
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [cardStyle, { opacity: pressed ? .86 : 1 }]}>{children}</Pressable> : <View style={cardStyle}>{children}</View>;
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  const p = usePalette();
  return <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 38, paddingHorizontal: 13, borderRadius: 19, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: selected ? p.brandSoft : p.surface, borderWidth: 1, borderColor: selected ? p.brand : p.line }}>
    {icon ? <Ionicons name={icon} size={15} color={selected ? p.brand : p.muted} /> : null}<Text style={{ color: selected ? p.brand : p.text, fontSize: 13, fontWeight: selected ? '700' : '600' }}>{label}</Text>
  </Pressable>;
}

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger'; icon?: keyof typeof Ionicons.glyphMap }) {
  const p = usePalette();
  const map = { neutral: [p.sunken, p.text], brand: [p.brandSoft, p.brand], success: [p.successSoft, p.success], warning: [p.warningSoft, p.warning], danger: [p.dangerSoft, p.danger] } as const;
  return <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: map[tone][0], paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 }}>
    {icon ? <Ionicons name={icon} size={13} color={map[tone][1]} /> : null}<Text style={{ color: map[tone][1], fontSize: 11, fontWeight: '800' }}>{label}</Text>
  </View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const p = usePalette();
  return <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12 }}><Text style={{ flex: 1, color: p.ink, fontSize: 18, fontWeight: '800' }}>{title}</Text>{action ? <Pressable onPress={onAction}><Text style={{ color: p.brand, fontSize: 13, fontWeight: '700' }}>{action}</Text></Pressable> : null}</View>;
}

export function SearchField({ value, onChangeText, placeholder = 'Search CampusSphere' }: { value: string; onChangeText: (text: string) => void; placeholder?: string }) {
  const p = usePalette();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, borderRadius: 14, minHeight: 48, paddingHorizontal: 14 }}><Ionicons name="search" size={19} color={p.muted} /><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={p.muted} style={{ flex: 1, color: p.ink, fontSize: 15 }} />{value ? <Pressable onPress={() => onChangeText('')}><Ionicons name="close-circle" size={20} color={p.muted} /></Pressable> : null}</View>;
}

export function Field({ label, value, onChangeText, placeholder, multiline, keyboardType, error }: { label: string; value: string; onChangeText: (text: string) => void; placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'email-address' | 'numeric' | 'url'; error?: string }) {
  const p = usePalette();
  return <View style={{ gap: 7 }}><Text style={{ color: p.text, fontSize: 13, fontWeight: '700' }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={p.muted} multiline={multiline} keyboardType={keyboardType} style={{ color: p.ink, backgroundColor: p.surface, borderWidth: 1, borderColor: error ? p.danger : p.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: multiline ? 13 : 0, minHeight: multiline ? 110 : 50, textAlignVertical: multiline ? 'top' : 'center' }} />{error ? <Text style={{ color: p.danger, fontSize: 12 }}>ⓘ {error}</Text> : null}</View>;
}

export function ToggleRow({ title, detail, value, onValueChange, disabled }: { title: string; detail?: string; value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  const p = usePalette();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }}><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 15, fontWeight: '700' }}>{title}</Text>{detail ? <Text style={{ color: p.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }}>{detail}</Text> : null}</View><Switch accessibilityLabel={title} disabled={disabled} value={value} onValueChange={onValueChange} trackColor={{ false: p.line, true: p.brand }} /></View>;
}

export function Segmented<T extends string>({ values, value, onChange }: { values: readonly T[]; value: T; onChange: (v: T) => void }) {
  const p = usePalette();
  return <View style={{ flexDirection: 'row', padding: 4, backgroundColor: p.surface, borderRadius: 14, borderWidth: 1, borderColor: p.line }}>{values.map((item) => <Pressable key={item} onPress={() => { if (item !== value) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); onChange(item); }} style={({ pressed }) => ({ flex: 1, minHeight: 40, borderRadius: 10, backgroundColor: item === value ? p.brandSoft : 'transparent', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.72 : 1 })}><Text style={{ color: item === value ? p.brand : p.muted, fontSize: 13, fontWeight: '700' }}>{item}</Text></Pressable>)}</View>;
}

export function GradientHero({ eyebrow, title, detail, colors = ['#DCE7FF', '#F7E6FF'], icon = 'sparkles' }: { eyebrow: string; title: string; detail: string; colors?: [string, string, ...string[]]; icon?: keyof typeof Ionicons.glyphMap }) {
  const p = usePalette();
  return <View style={{ borderRadius: 24, padding: 20, minHeight: 176, justifyContent: 'space-between', overflow: 'hidden', backgroundColor: colors[0], borderWidth: 10, borderColor: colors[1] }}><View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,.66)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 }}><Text style={{ color: '#344054', fontSize: 11, fontWeight: '800', letterSpacing: .6 }}>{eyebrow.toUpperCase()}</Text></View><View><Ionicons name={icon} size={30} color={p.brand} /><Text style={{ color: '#101828', fontSize: 27, lineHeight: 32, fontWeight: '900', marginTop: 10 }}>{title}</Text><Text style={{ color: '#475467', fontSize: 14, lineHeight: 20, marginTop: 6 }}>{detail}</Text></View></View>;
}

export function StateView({ icon, title, detail, action, onAction, tone = 'brand' }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; action?: string; onAction?: () => void; tone?: 'brand' | 'warning' | 'danger' }) {
  const p = usePalette(); const color = tone === 'warning' ? p.warning : tone === 'danger' ? p.danger : p.brand;
  return <View style={{ alignItems: 'center', paddingVertical: 42, paddingHorizontal: 22 }}><View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: tone === 'warning' ? p.warningSoft : tone === 'danger' ? p.dangerSoft : p.brandSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={30} color={color} /></View><Text style={{ color: p.ink, fontSize: 19, fontWeight: '800', textAlign: 'center', marginTop: 16 }}>{title}</Text><Body muted style={{ textAlign: 'center', marginTop: 7 }}>{detail}</Body>{action && onAction ? <View style={{ marginTop: 18 }}><Button compact label={action} onPress={onAction} /></View> : null}</View>;
}

export function SafetyMenu({ target, targetType, targetId, userId }: { target: string; targetType?: string; targetId?: string; userId?: string }) {
  const p = usePalette(); const showToast = useAppStore((s) => s.showToast); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const submitReport = async () => {
    if (!targetType || !targetId) { showToast({ type: 'error', message: 'This content cannot be reported from this screen.' }); return; }
    setBusy(true);
    try { const { apiPost } = await import('@/lib/api'); await apiPost('/reports', { targetType, targetId, reason: 'other', details: `Reported from ${targetType} safety menu.` }); setOpen(false); showToast({ type: 'success', message: 'Report submitted for moderation review.' }); }
    catch (error) { showToast({ type: 'error', message: (error as Error).message }); } finally { setBusy(false); }
  };
  const blockAccount = async () => {
    if (!userId) { showToast({ type: 'error', message: 'Account block is unavailable for this item.' }); return; }
    setBusy(true);
    try { const { apiPost } = await import('@/lib/api'); await apiPost('/blocks', { blockedUserId: userId }); setOpen(false); showToast({ type: 'success', message: 'Account blocked. Their content is now hidden by server policy.' }); }
    catch (error) { showToast({ type: 'error', message: (error as Error).message }); } finally { setBusy(false); }
  };
  const actions: { icon: keyof typeof Ionicons.glyphMap; label: string; run: () => void; enabled: boolean }[] = [
    { icon: 'flag-outline', label: 'Submit report', run: () => void submitReport(), enabled: Boolean(targetType && targetId) },
    { icon: 'person-remove-outline', label: 'Block account', run: () => void blockAccount(), enabled: Boolean(userId) },
  ];
  return <><IconButton icon="ellipsis-horizontal" label={`More actions for ${target}`} onPress={() => setOpen(true)} /><Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}><Pressable onPress={() => setOpen(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,24,40,.42)' }}><Pressable style={{ backgroundColor: p.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 }}><View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: p.line, alignSelf: 'center', marginBottom: 20 }} /><Text style={{ color: p.ink, fontSize: 19, fontWeight: '800', marginBottom: 8 }}>Content actions</Text><Body muted>Reports and blocks are enforced by CampusSphere servers.</Body>{actions.map((item) => <Pressable key={item.label} disabled={busy || !item.enabled} onPress={item.run} style={{ minHeight: 54, opacity: item.enabled ? 1 : .45, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: p.line }}><Ionicons name={item.icon} size={21} color={item.label === 'Block account' ? p.danger : p.text} /><Text style={{ color: item.label === 'Block account' ? p.danger : p.ink, fontWeight: '700' }}>{item.label}</Text></Pressable>)}<View style={{ marginTop: 14 }}><Button variant="ghost" label="Cancel" disabled={busy} onPress={() => setOpen(false)} /></View></Pressable></Pressable></Modal></>;
}

export function OwnerActions({ target, onEdit, onDelete, onCopy }: { target: string; onEdit: () => void; onDelete: () => void; onCopy?: () => void }) {
  const p = usePalette(); const showToast = useAppStore((s) => s.showToast); const [open, setOpen] = useState(false); const [confirming, setConfirming] = useState(false);
  const close = () => { setOpen(false); setConfirming(false); };
  return <><IconButton icon="ellipsis-horizontal" label={`Manage ${target}`} onPress={() => setOpen(true)} /><Modal transparent visible={open} animationType="fade" onRequestClose={close}><Pressable onPress={close} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,24,40,.48)' }}><Pressable style={{ backgroundColor: p.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 34 }}><View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: p.line, alignSelf: 'center', marginBottom: 18 }} />{confirming ? <><View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: p.dangerSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="trash-outline" size={24} color={p.danger} /></View><Text style={{ color: p.ink, fontSize: 20, fontWeight: '900', marginTop: 14 }}>Delete {target}?</Text><Body muted style={{ marginTop: 6 }}>This removes it immediately from CampusSphere. Deleted content cannot be restored from the main app.</Body><View style={{ gap: 9, marginTop: 18 }}><Button variant="danger" label="Delete permanently" icon="trash-outline" onPress={() => { close(); onDelete(); }} /><Button variant="ghost" label="Keep it" onPress={() => setConfirming(false)} /></View></> : <><Text style={{ color: p.ink, fontSize: 20, fontWeight: '900' }}>Manage {target}</Text><Body muted style={{ marginTop: 5 }}>Owner controls. No report or block-yourself actions.</Body><Pressable onPress={() => { close(); onEdit(); }} style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: p.line, marginTop: 14 }}><Ionicons name="create-outline" size={22} color={p.brand} /><Text style={{ color: p.ink, fontWeight: '800' }}>Edit</Text></Pressable><Pressable onPress={() => { close(); onCopy?.(); showToast({ type: 'success', message: `${target[0].toUpperCase()}${target.slice(1)} link copied.` }); }} style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: p.line }}><Ionicons name="link-outline" size={22} color={p.text} /><Text style={{ color: p.ink, fontWeight: '800' }}>Copy link</Text></Pressable><Pressable onPress={() => setConfirming(true)} style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 14 }}><Ionicons name="trash-outline" size={22} color={p.danger} /><Text style={{ color: p.danger, fontWeight: '800' }}>Delete</Text></Pressable><Button variant="ghost" label="Cancel" onPress={close} /></>}</Pressable></Pressable></Modal></>;
}

export function ToastBanner() {
  const p = usePalette(); const toast = useAppStore((s) => s.toast); if (!toast) return null;
  const color = toast.type === 'error' ? p.danger : toast.type === 'success' ? p.success : p.brand;
  return <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, top: 54, backgroundColor: p.surface, borderColor: color, borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow }}><Ionicons name={toast.type === 'error' ? 'alert-circle' : toast.type === 'success' ? 'checkmark-circle' : 'information-circle'} color={color} size={21} /><Text style={{ flex: 1, color: p.ink, fontWeight: '700' }}>{toast.message}</Text></View>;
}
