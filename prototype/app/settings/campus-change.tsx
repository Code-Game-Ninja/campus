import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Button, Card, IconButton, Screen, SearchField, StateView, TopBar } from '@/components/ui';
import { useDebounced, useUniversitySearch, type University } from '@/lib/universities';
import { apiPost } from '@/lib/api';
import { queryClient } from '@/lib/query';
import { apiQueryKey } from '@/lib/api-hooks';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

export default function CampusChange() {
  const p = usePalette(); const toast = useAppStore((s) => s.showToast); const [search,setSearch]=useState(''); const [selected,setSelected]=useState<University|null>(null); const [submitting,setSubmitting]=useState(false); const query=useUniversitySearch({q:useDebounced(search)});
  const submit=async()=>{if(!selected)return;setSubmitting(true);try{await apiPost('/account/requests',{type:'campus_change',targetUniversityId:selected.id});await queryClient.invalidateQueries({queryKey:apiQueryKey('account-requests')});toast({type:'success',message:'Campus-change request submitted.'});goBackOrReplace('/settings/privacy');}catch(error){toast({type:'error',message:(error as Error).message});}finally{setSubmitting(false);}};
  return <Screen><TopBar title="Change campus" subtitle="Audited administrator review" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/settings/privacy')} />} /><SearchField value={search} onChangeText={setSearch} placeholder="Search target university" />{query.isLoading?<StateView icon="hourglass-outline" title="Searching universities" detail="Checking verified catalogue…" />:query.isError?<StateView icon="cloud-offline" tone="danger" title="Search unavailable" detail={query.error.message}/>:<View>{query.data?.items.slice(0,20).map((item)=><Card key={item.id} style={{marginTop:8}}><Button label={item.name} icon={selected?.id===item.id?'checkmark-circle':'school-outline'} variant={selected?.id===item.id?'primary':'ghost'} onPress={()=>setSelected(item)}/><Text style={{color:p.muted}}>{item.stateProvince??item.country}</Text></Card>)}</View>}{selected?<Button label={`Request move to ${selected.name}`} icon="send-outline" loading={submitting} onPress={()=>void submit()}/>:null}</Screen>;
}
