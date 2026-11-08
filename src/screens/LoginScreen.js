import React, { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F, DEVICES } from '../config';
import { Btn, Label } from '../ui';
import { changePassword, loadAgent, signIn, signOut } from '../api';

const input = { height: 50, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, fontFamily: F.regular, fontSize: 16, color: C.text, marginBottom: 14 };
const strong = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

// Connexion avec le compte créé par l'administrateur, puis choix du mot de passe personnel à la première connexion.
export default function LoginScreen({ onLogin, initialDevice }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [device, setDevice] = useState(initialDevice || DEVICES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null); // { agent } : changement de mot de passe requis
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const user = await signIn(email, password);
      let agent;
      try { agent = await loadAgent(user.id); } catch (e) { await signOut(); throw e; }
      if (agent.mustChange) setPending({ agent });
      else onLogin(agent, device);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const savePassword = async () => {
    if (pw1 !== pw2) return setError('Les mots de passe sont différents.');
    if (!strong(pw1)) return setError('8 caractères minimum, avec au moins une lettre et un chiffre.');
    if (pw1 === password) return setError("Choisissez un mot de passe différent du PIN temporaire.");
    setBusy(true); setError('');
    try { await changePassword(pw1); onLogin({ ...pending.agent, mustChange: false }, device); } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const Eye = () => (
    <Pressable onPress={() => setShow(!show)} style={{ position: 'absolute', right: 14, top: 14 }}><Feather name={show ? 'eye-off' : 'eye'} size={22} color={C.muted} /></Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={{ padding: 22, paddingTop: 40, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Image source={require('../../assets/logo.png')} style={{ width: 200, height: 90 }} resizeMode="contain" />
          <Text style={{ fontFamily: F.medium, color: C.muted, marginTop: 6 }}>Contrôle d'accès - agents</Text>
        </View>

        {pending ? (
          <>
            <Text style={{ fontFamily: F.bold, fontSize: 22, color: C.text, marginBottom: 6 }}>Choisissez votre mot de passe</Text>
            <Text style={{ fontFamily: F.regular, color: C.muted, marginBottom: 16 }}>Bonjour {pending.agent.name}. Remplacez le PIN temporaire par un mot de passe que vous êtes seul à connaître (8 caractères minimum, une lettre et un chiffre).</Text>
            <Label>Nouveau mot de passe</Label>
            <View><TextInput style={input} value={pw1} onChangeText={setPw1} secureTextEntry={!show} autoCapitalize="none" /><Eye /></View>
            <Label>Confirmation</Label>
            <TextInput style={input} value={pw2} onChangeText={setPw2} secureTextEntry={!show} autoCapitalize="none" />
            {!!error && <Text style={{ color: C.red, fontFamily: F.medium, marginBottom: 12 }}>{error}</Text>}
            <Btn label={busy ? 'Enregistrement...' : 'Enregistrer et continuer'} onPress={savePassword} disabled={busy} icon={busy ? <ActivityIndicator color="#fff" /> : null} />
            <Btn label="Annuler" kind="secondary" style={{ marginTop: 10 }} onPress={async () => { await signOut(); setPending(null); setPassword(''); setError(''); }} />
          </>
        ) : (
          <>
            <Label>E-mail</Label>
            <TextInput style={input} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="agent@exemple.com" />
            <Label>Mot de passe ou PIN temporaire</Label>
            <View><TextInput style={input} value={password} onChangeText={setPassword} secureTextEntry={!show} autoCapitalize="none" /><Eye /></View>
            <Label>Porte / appareil</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {DEVICES.map((d) => (
                <Pressable key={d} onPress={() => setDevice(d)} style={{ paddingHorizontal: 14, height: 42, borderRadius: 12, justifyContent: 'center', backgroundColor: device === d ? C.brand : '#fff', borderWidth: 1, borderColor: device === d ? C.brand : C.border }}>
                  <Text style={{ fontFamily: F.medium, color: device === d ? '#fff' : C.text }}>{d}</Text>
                </Pressable>
              ))}
            </View>
            {!!error && <Text style={{ color: C.red, fontFamily: F.medium, marginBottom: 12 }}>{error}</Text>}
            <Btn label={busy ? 'Connexion...' : 'Se connecter'} onPress={submit} disabled={busy || !email || !password} icon={busy ? <ActivityIndicator color="#fff" /> : null} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
