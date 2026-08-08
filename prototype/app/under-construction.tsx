import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Body, Button, Card, Heading, Screen } from '@/components/ui';
import { goBackOrReplace } from '@/lib/navigation';
import { usePalette } from '@/theme/usePalette';

export default function UnderConstruction() {
  const p = usePalette();
  const { feature } = useLocalSearchParams<{ feature?: string | string[] }>();
  const title = Array.isArray(feature) ? feature[0] : feature;

  return (
    <Screen scroll={false} style={{ justifyContent: 'center' }}>
      <Card style={{ padding: 24, alignItems: 'center' }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: p.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="construct-outline" size={34} color={p.brand} />
        </View>
        <Heading size={25}>{title || 'This feature'} is under construction</Heading>
        <Body muted style={{ textAlign: 'center', marginTop: 10 }}>
          Stay tuned. We are finishing security, cloud-service verification, and production testing before enabling it.
        </Body>
        <View style={{ alignSelf: 'stretch', marginTop: 22 }}>
          <Button label="Back to Discover" icon="compass-outline" onPress={() => goBackOrReplace('/(tabs)/discover')} />
        </View>
      </Card>
    </Screen>
  );
}
