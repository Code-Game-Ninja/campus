import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Badge, Body, Card, IconButton, Screen, SectionHeader, TopBar } from '@/components/ui';
import { developerPageLinks, developers } from '@/data/developers';
import { goBackOrReplace } from '@/lib/navigation';
import { usePalette } from '@/theme/usePalette';

export default function DevelopersScreen() {
  const p = usePalette();

  const openLink = async (url: string) => {
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
  };

  return (
    <Screen>
      <TopBar
        title="Developers"
        subtitle="Meet the people behind CampusSphere"
        left={(
          <IconButton
            icon="chevron-back"
            label="Back to Discover"
            onPress={() => goBackOrReplace('/(tabs)/discover')}
          />
        )}
      />

      <Card style={{ marginTop: 8, backgroundColor: p.brandSoft, borderColor: p.brand }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="code-slash" size={25} color={p.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: p.ink, fontSize: 20, fontWeight: '900' }}>Built for campus life</Text>
            <Body muted style={{ marginTop: 4 }}>
              CampusSphere is crafted by a small team focused on safer, more connected student communities.
            </Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 12 }}>
              {developerPageLinks.map((link) => (
                <Pressable
                  key={link.url}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${link.label}`}
                  onPress={() => void openLink(link.url)}
                  style={({ pressed }) => ({
                    minHeight: 40,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: p.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                    opacity: pressed ? 0.72 : 1,
                  })}
                >
                  <Ionicons name={link.icon} size={17} color={p.brand} />
                  <Text style={{ color: p.brand, fontSize: 13, fontWeight: '800' }}>{link.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Card>

      <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Ionicons name="information-circle-outline" size={21} color={p.brand} />
        <Body muted style={{ flex: 1 }}>
          Team cards show ownership across full CampusSphere roadmap. Some planned features remain staged or disabled in current MVP and will appear only after release approval.
        </Body>
      </Card>

      <SectionHeader title="Development team" />
      <View style={{ gap: 12 }}>
        {developers.map((developer) => (
          <Card key={developer.name}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 13 }}>
              <Avatar initials={developer.initials} size={56} accent={p.brandSoft} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: p.ink, fontSize: 17, fontWeight: '900' }}>{developer.name}</Text>
                <View style={{ marginTop: 6 }}>
                  <Badge label={developer.role} tone="brand" icon="code-working-outline" />
                </View>
                <Text style={{ color: p.muted, fontSize: 12, fontWeight: '700', marginTop: 7 }}>{developer.track}</Text>
              </View>
            </View>

            <Body muted style={{ marginTop: 13 }}>{developer.bio}</Body>

            <View style={{ gap: 8, marginTop: 14 }}>
              {developer.focusAreas.map((focusArea) => (
                <View key={focusArea} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Ionicons name="checkmark-circle-outline" size={17} color={p.brand} style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, color: p.text, fontSize: 13, lineHeight: 19 }}>{focusArea}</Text>
                </View>
              ))}
            </View>

            {developer.links?.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 15 }}>
                {developer.links.map((link) => (
                  <Pressable
                    key={link.url}
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${link.label} for ${developer.name}`}
                    onPress={() => void openLink(link.url)}
                    style={({ pressed }) => ({
                      minHeight: 40,
                      paddingHorizontal: 13,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: p.line,
                      backgroundColor: p.surface,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 7,
                      opacity: pressed ? 0.72 : 1,
                    })}
                  >
                    <Ionicons name={link.icon} size={17} color={p.brand} />
                    <Text style={{ color: p.brand, fontSize: 13, fontWeight: '800' }}>{link.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Card>
        ))}
      </View>

      <Card style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name="heart" size={22} color={p.danger} />
        <Body style={{ flex: 1 }}>Made with care for students, clubs, creators, and campus communities.</Body>
      </Card>
    </Screen>
  );
}
