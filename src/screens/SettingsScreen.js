import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { C, F, DEVICES } from '../config';
import { Btn, Card, Label, Title } from '../ui';

export default function SettingsScreen({ agent, device, setDevice, online, queue, onSync, onLogout }) {
  const [msg, setMsg] = useState('');
  const sync = async () => { setMsg((await onSync()) ? 'Synchronisation réussie.' : 'Impossible de joindre le serveur.'); };
  return (
    <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
      <Title>Réglages</Title>
      <Card>
        <Label>Agent connecté</Label>
        <Text style={{ fontFamily: F.bold, fontSize: 20, color: C.text }}>{agent.name}</Text>
        <Text style={{ fontFamily: F.regular, color: C.muted }}>{agent.email}</Text>
      </Card>
      <Card>
        <Label>Porte / appareil</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DEVICES.map((d) => (
            <Pressable key={d} onPress={() => setDevice(d)} style={{ paddingHorizontal: 14, height: 42, borderRadius: 12, justifyContent: 'center', backgroundColor: device === d ? C.brand : C.bg }}>
              <Text style={{ fontFamily: F.medium, color: device === d ? '#fff' : C.text }}>{d}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Card>
        <Text style={{ fontFamily: F.regular, color: C.muted, marginBottom: 10 }}>État : {online ? 'en ligne' : 'hors ligne'} - scans en attente d'envoi : {queue}</Text>
        <Btn label="Synchroniser maintenant" kind="secondary" onPress={sync} />
        {!!msg && <Text style={{ fontFamily: F.medium, color: msg.startsWith('Synchro') ? C.brandDark : C.red, marginTop: 10 }}>{msg}</Text>}
      </Card>
      <Btn label="Se déconnecter" kind="secondary" onPress={onLogout} />
    </ScrollView>
  );
}
