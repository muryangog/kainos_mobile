import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable, TextInput } from 'react-native';
import { C, F, DEVICES, getWebUrl, setCustomWebUrl } from '../config';
import { Btn, Card, Label, Title } from '../ui';

export default function SettingsScreen({ agent, device, setDevice, online, queue, onSync, onLogout, onSaveWebUrl }) {
  const [msg, setMsg] = useState('');
  const [urlInput, setUrlInput] = useState(getWebUrl());
  const [urlSavedMsg, setUrlSavedMsg] = useState('');

  const sync = async () => { setMsg((await onSync()) ? 'Synchronisation réussie.' : 'Impossible de joindre le serveur.'); };

  const handleSaveUrl = () => {
    const clean = urlInput.trim().replace(/\/+$/, '');
    if (!/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(clean) || /example\.com|localhost|127\.0\.0\.1/i.test(clean)) {
      setUrlSavedMsg('Adresse invalide : utilisez l’URL publique déployée du site.');
      return;
    }
    setCustomWebUrl(clean);
    if (onSaveWebUrl) onSaveWebUrl(clean);
    setUrlSavedMsg('Adresse web enregistrée.');
    setTimeout(() => setUrlSavedMsg(''), 3000);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
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
        <Label>Adresse du site web (liens des pass)</Label>
        <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.muted, marginBottom: 8 }}>
          Adresse utilisée pour le partage des pass (ex. votre URL Vercel).
        </Text>
        <TextInput
          value={urlInput}
          onChangeText={setUrlInput}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="https://kainos.vercel.app"
          style={{
            height: 48,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            fontFamily: F.regular,
            fontSize: 15,
            color: C.text,
            marginBottom: 10,
          }}
        />
        <Btn label="Enregistrer l'adresse web" kind="secondary" onPress={handleSaveUrl} />
        {!!urlSavedMsg && (
          <Text style={{ fontFamily: F.medium, color: C.brandDark, marginTop: 8 }}>{urlSavedMsg}</Text>
        )}
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
