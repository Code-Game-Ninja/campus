import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Body, Button, Chip, Field, IconButton, Screen, TopBar } from '@/components/ui';
import { apiQueryKey, useApiMutation } from '@/lib/api-hooks';
import { queryClient } from '@/lib/query';
import type { TeamRequest } from '@/lib/discovery';
import { useAppStore } from '@/store/useAppStore';

export default function NewTeam() {
  const toast = useAppStore((s) => s.showToast); const [scope, setScope] = useState<'campus' | 'global'>('campus'); const [name, setName] = useState(''); const [goal, setGoal] = useState(''); const [skills, setSkills] = useState(''); const [capacity, setCapacity] = useState('4'); const [prompt, setPrompt] = useState('Why are you a good fit for this team?');
  const create = useApiMutation<TeamRequest, Record<string, unknown>>('/team-requests', 'POST', { onSuccess: async (team) => { await queryClient.invalidateQueries({ queryKey: ['api', 'team-requests'] }); toast({ type: 'success', message: 'Team request created.' }); router.replace(`/discover/tribe/team/${team.id}`); }, onError: (error) => toast({ type: 'error', message: error.message }) });
  return <Screen><TopBar title="Create a team request" subtitle="People apply; owner reviews" left={<IconButton icon="close" label="Close" onPress={() => goBackOrReplace('/discover/tribe')} />} /><Body style={{ marginTop: 12 }}>Describe a concrete goal and needed skills. Accepted applications create authorized connections.</Body><View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}><Chip label="Campus" selected={scope === 'campus'} onPress={() => setScope('campus')} /><Chip label="Global" selected={scope === 'global'} onPress={() => setScope('global')} /></View><View style={{ gap: 16, marginTop: 20 }}><Field label="Team request title" value={name} onChangeText={setName} placeholder="e.g. Accessible Maps Lab" /><Field label="Project goal" value={goal} onChangeText={setGoal} multiline placeholder="What will this team build or accomplish?" /><Field label="Skills (comma separated)" value={skills} onChangeText={setSkills} placeholder="Research, React Native, Maps" /><Field label="Capacity" value={capacity} onChangeText={(value) => setCapacity(value.replace(/\D/g, ''))} keyboardType="numeric" /><Field label="Application prompt" value={prompt} onChangeText={setPrompt} multiline /><Button label="Create team request" loading={create.isPending} onPress={() => create.mutate({ scope, title: name.trim(), description: goal.trim(), neededTags: skills.split(',').map((item) => item.trim()).filter(Boolean), capacity: Number(capacity) || undefined, applicationPrompt: prompt.trim() || undefined })} disabled={!name.trim() || !goal.trim()} /></View></Screen>;
}
