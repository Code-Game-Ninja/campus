/**
 * University picker â€” onboarding step between email verification and profile setup.
 *
 * Backed by the public /universities endpoint (~10k institutions, 200+
 * countries), which is unauthenticated by design: a user must find their
 * institution before they have an account or a campus.
 *
 * Selecting here records an INTENT only. The server still resolves the real
 * campus_id at signup, so nothing chosen on this screen grants access to a
 * tenant â€” see packages/contracts/src/universities.ts.
 */
import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Button, IconButton, SearchField, StateView } from '@/components/ui';
import { usePalette } from '@/theme/usePalette';
import { useAppStore } from '@/store/useAppStore';
import {
  useDebounced,

  useUniversitySearch,
  type University,
} from '@/lib/universities';
import { bootstrapIdentity } from '@/lib/auth';



export default function UniversityPicker() {
  const p = usePalette();
  const setOnboardingRoute = useAppStore((s) => s.setOnboardingRoute);
  const showToast = useAppStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<University | null>(null);

  // Debounced so typing doesn't fire a request per keystroke.
  const debouncedSearch = useDebounced(search);
  const searchQuery = useUniversitySearch({ q: debouncedSearch });

  const results = searchQuery.data?.items ?? [];
  const total = searchQuery.data?.total ?? 0;

  const [submitting, setSubmitting] = useState(false);
  const confirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await bootstrapIdentity(selected.id);
      setOnboardingRoute('profile');
      router.replace('/(onboarding)/profile-setup');
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not create your campus account.' });
    } finally { setSubmitting(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: p.canvas }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56 }}>
        <IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(auth)/welcome')} />

        <Text
          style={{
            color: p.ink,
            fontSize: 30,
            lineHeight: 36,
            fontWeight: '900',
            letterSpacing: -1,
            marginTop: 20,
          }}
        >
          Find your university
        </Text>
        <Text style={{ color: p.muted, fontSize: 15, lineHeight: 22, marginTop: 8 }}>Search universities across India.</Text>

        <View style={{ marginTop: 18 }}>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="e.g. Delhi University, IIT Bombay"
          />
        </View>
        {total > 0 ? (
          <Text style={{ color: p.muted, fontSize: 12, marginTop: 14 }}>
            Showing {results.length} of {total.toLocaleString()} matches
          </Text>
        ) : null}
      </View>

      {/* Results */}
      <View style={{ flex: 1, marginTop: 10 }}>
        {searchQuery.isError ? (
          <View style={{ padding: 20 }}>
            <StateView
              icon="cloud-offline"
              tone="danger"
              title="Cannot reach the API"
              detail={(searchQuery.error as Error).message}
              action="Retry"
              onAction={() => searchQuery.refetch()}
            />
          </View>
        ) : searchQuery.isLoading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <ActivityIndicator color={p.brand} />
          </View>
        ) : results.length === 0 ? (
          <View style={{ padding: 20 }}>
            <StateView
              icon="school"
              title="No matches"
              detail={
                search
                  ? `Nothing found for "${search}". Try a shorter search.`
                  : 'Start typing to search for your university.'
              }
            />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <UniversityRow
                university={item}
                selected={selected?.id === item.id}
                onPress={() => setSelected(item)}
                palette={p}
              />
            )}
          />
        )}
      </View>

      {/* Confirm bar â€” only once something is chosen, so it never blocks the list. */}
      {selected ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: 18,
            paddingBottom: 30,
            backgroundColor: p.surface,
            borderTopWidth: 1,
            borderTopColor: p.line,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="checkmark-circle" size={20} color={p.success} />
            <Text style={{ color: p.ink, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>
              {selected.name}
            </Text>
          </View>
          <Button label="Continue" icon="arrow-forward" onPress={confirm} loading={submitting} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
function UniversityRow({
  university,
  selected,
  onPress,
  palette,
}: {
  university: University;
  selected: boolean;
  onPress: () => void;
  palette: ReturnType<typeof usePalette>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 16,
        marginTop: 10,
        backgroundColor: selected ? palette.brandSoft : palette.surface,
        borderWidth: 1,
        borderColor: selected ? palette.brand : palette.line,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: palette.brandSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="school" size={19} color={palette.brand} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.ink, fontSize: 14, fontWeight: '700' }} numberOfLines={2}>
          {university.name}
        </Text>
        <Text style={{ color: palette.muted, fontSize: 12, marginTop: 3 }} numberOfLines={1}>
          {university.stateProvince
            ? `${university.stateProvince}, ${university.country}`
            : university.country}
          {university.domain ? ` Â· ${university.domain}` : ''}
        </Text>
      </View>

      {selected ? <Ionicons name="checkmark-circle" size={22} color={palette.brand} /> : null}
    </Pressable>
  );
}






