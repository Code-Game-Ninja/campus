import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  'home/index': 'home',
  'discover/index': 'compass',
  create: 'add',
  'activity/index': 'notifications',
  'profile/index': 'person',
};

type QuickAction = {
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
};

const baseActions: QuickAction[] = [
  { title: 'Post', detail: 'Start a discussion or announcement', icon: 'create', color: '#DCE7FF', route: '/compose' },
  { title: 'Team', detail: 'Find people and build together', icon: 'people-circle', color: '#DDF7E8', route: '/discover/tribe/new-team' },
  { title: 'Notes', detail: 'Share a useful study resource', icon: 'document-attach', color: '#E9E6FF', route: '/discover/notes/upload' },
];

function CreateQuickMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const p = usePalette();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const bubbleAnimations = useRef(Array.from({ length: 6 }, () => new Animated.Value(0))).current;
  const actions = baseActions;

  useEffect(() => {
    if (!visible) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    backdropOpacity.setValue(0);
    bubbleAnimations.forEach((value) => value.setValue(0));
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.stagger(45, bubbleAnimations.slice(0, actions.length).map((value) => Animated.spring(value, { toValue: 1, damping: 13, stiffness: 210, mass: 0.68, useNativeDriver: true }))),
    ]).start();
  }, [actions.length, backdropOpacity, bubbleAnimations, visible]);

  const go = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as never), 90);
  };

  return <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, opacity: backdropOpacity, backgroundColor: 'rgba(16,24,40,.48)' }} />
      <Pressable accessibilityLabel="Close create menu" onPress={onClose} style={StyleSheet.absoluteFillObject} />
      <View pointerEvents="box-none" style={{ paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' }}>
        <Animated.View style={{ opacity: backdropOpacity, backgroundColor: p.surface, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 9, marginBottom: 18, shadowColor: '#101828', shadowOpacity: 0.16, shadowRadius: 12, elevation: 8 }}><Text style={{ color: p.ink, fontSize: 16, fontWeight: '900' }}>What will you create?</Text></Animated.View>
        <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 24, rowGap: 16 }}>
          {actions.map((action, index) => {
            const animation = bubbleAnimations[index];
            return <Animated.View key={action.title} style={{ width: 84, alignItems: 'center', opacity: animation, transform: [{ translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }, { scale: animation.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }] }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${action.title}. ${action.detail}`} onPress={() => go(action.route)} style={({ pressed }) => ({ width: 72, height: 72, borderRadius: 36, backgroundColor: action.color, borderWidth: 3, borderColor: 'rgba(255,255,255,.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#101828', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 9, transform: [{ scale: pressed ? 0.9 : 1 }] })}><Ionicons name={action.icon} size={29} color="#344054" /></Pressable>
              <View style={{ backgroundColor: p.surface, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, marginTop: 7, shadowColor: '#101828', shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 }}><Text style={{ color: p.ink, fontSize: 11, fontWeight: '900' }}>{action.title}</Text></View>
            </Animated.View>;
          })}
        </View>
        <Animated.View style={{ opacity: backdropOpacity, marginTop: 20 }}><Pressable accessibilityLabel="Close create menu" onPress={onClose} style={({ pressed }) => ({ width: 58, height: 58, borderRadius: 29, backgroundColor: p.brand, borderWidth: 4, borderColor: 'rgba(255,255,255,.9)', alignItems: 'center', justifyContent: 'center', shadowColor: p.brand, shadowOpacity: 0.35, shadowRadius: 12, elevation: 10, transform: [{ rotate: '45deg' }, { scale: pressed ? 0.9 : 1 }] })}><Ionicons name="add" size={30} color="#FFFFFF" /></Pressable></Animated.View>
      </View>
    </View>
  </Modal>;
}

function FloatingTabBar({ state, descriptors, navigation }: any) {
  const p = usePalette();
  const [menuOpen, setMenuOpen] = useState(false);
  return <>
    <View style={{ height: 82, backgroundColor: p.surface, borderTopWidth: 1, borderTopColor: p.line, flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8, paddingBottom: 18 }}>
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const isCreate = route.name === 'create';
        const options = descriptors[route.key]?.options ?? {};
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const onPress = () => {
          if (isCreate) { setMenuOpen(true); return; }
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return <Pressable key={route.key} accessibilityRole="button" accessibilityState={focused ? { selected: true } : {}} accessibilityLabel={String(label)} onPress={onPress} onLongPress={isCreate ? () => setMenuOpen(true) : undefined} style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'flex-start', opacity: pressed ? 0.72 : 1 })}>
          {isCreate ? <View style={{ width: 58, height: 58, borderRadius: 29, marginTop: -22, backgroundColor: p.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: p.canvas, shadowColor: p.brand, shadowOpacity: 0.32, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 8 }}><Ionicons name="add" size={30} color="#FFFFFF" /></View> : <Ionicons name={`${focused ? icons[route.name] : `${icons[route.name]}-outline`}` as keyof typeof Ionicons.glyphMap} size={22} color={focused ? p.brand : p.muted} />}
          {!isCreate ? <Text style={{ color: focused ? p.brand : p.muted, fontSize: 11, fontWeight: '700', marginTop: 4 }}>{label}</Text> : <Text style={{ color: p.brand, fontSize: 11, fontWeight: '800', marginTop: 2 }}>Create</Text>}
        </Pressable>;
      })}
    </View>
    <CreateQuickMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
  </>;
}

export default function TabLayout() {
  const p = usePalette();
  const sessionResolved = useAppStore((state) => state.sessionResolved);
  const authenticated = useAppStore((state) => state.authenticated);
  const onboardingRoute = useAppStore((state) => state.onboardingRoute);

  if (!sessionResolved) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.canvas }}><ActivityIndicator color={p.brand} /></View>;
  }
  if (!authenticated) return <Redirect href="/(auth)/welcome" />;
  if (onboardingRoute === 'university') return <Redirect href="/(onboarding)/university" />;
  if (onboardingRoute === 'profile') return <Redirect href="/(onboarding)/profile-setup" />;

  return <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false, animation: 'fade' }}>
    <Tabs.Screen name="home/index" options={{ title: 'Home' }} />
    <Tabs.Screen name="discover/index" options={{ title: 'Discover' }} />
    <Tabs.Screen name="create" options={{ title: 'Create' }} />
    <Tabs.Screen name="activity/index" options={{ title: 'Activity' }} />
    <Tabs.Screen name="profile/index" options={{ title: 'Profile' }} />
  </Tabs>;
}
