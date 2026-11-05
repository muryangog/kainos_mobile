import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, TextInput, Vibration, View, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { C, F, KEYWORD, money } from '../config';
import { Btn } from '../ui';

export function Result({ res, onClose }) {
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (res.ok) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(blink, { toValue: 0.55, duration: 350, useNativeDriver: true }),
      Animated.timing(blink, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [res]);
  const r = res.record;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: res.ok ? C.brand : '#7F1D1D', zIndex: 10 }]}>
      {!res.ok && <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.red, opacity: blink }]} />}
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 70, flexGrow: 1 }}>
        <View style={{ alignItems: 'center' }}>
          <Feather name={res.ok ? 'check-circle' : 'x-circle'} size={96} color="#fff" />
          <Text style={{ fontFamily: F.bold, color: '#fff', fontSize: 30, textAlign: 'center', marginTop: 12 }}>{res.ok ? 'Entrée validée' : res.msg}</Text>
        </View>
        {r && (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, padding: 18, marginTop: 28, gap: 6 }}>
            <Text style={{ fontFamily: F.bold, color: '#fff', fontSize: 24 }}>{r.name}</Text>
            <Text style={s.line}>{r.id} - {r.passType}{r.place ? ` - Place ${r.place}` : ''}</Text>
            <Text style={s.line}>{r.phone}</Text>
            <Text style={s.line}>{r.email}</Text>
            <Text style={s.line}>{money(r.amount)} - {r.status === 'confirmed' ? 'Paiement confirmé' : 'Paiement en attente'}</Text>
          </View>
        )}
        <View style={{ alignSelf: 'center', marginTop: 22, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)' }}>
          <Text style={{ fontFamily: F.bold, color: '#fff', fontSize: 20 }}>{KEYWORD}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onClose} style={{ height: 56, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 28 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 18, color: res.ok ? C.brandDark : C.red }}>Scanner le suivant</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({ line: { fontFamily: F.regular, color: '#fff', fontSize: 17 } });

export default function ScanScreen({ onScan, session, online, queue }) {
  const [perm, ask] = useCameraPermissions();
  const [res, setRes] = useState(null);
  const [manual, setManual] = useState('');
  const [torch, setTorch] = useState(false);
  const lock = useRef(false);

  const handle = async (code) => {
    if (lock.current || !code) return;
    lock.current = true;
    const r = await onScan(code);
    Vibration.vibrate(r.ok ? 80 : [0, 250, 100, 250, 100, 450]);
    setRes(r); setManual('');
  };
  const close = () => { setRes(null); setTimeout(() => { lock.current = false; }, 500); };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontFamily: F.bold, fontSize: 22, color: C.text }}>Scanner</Text>
          <Text style={{ fontFamily: F.regular, color: C.muted }}>{session.device} - {session.agent}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: online ? C.soft : '#FEF3C7' }}>
          <Feather name={online ? 'wifi' : 'wifi-off'} size={16} color={online ? C.brandDark : '#B45309'} />
          <Text style={{ fontFamily: F.medium, color: online ? C.brandDark : '#B45309' }}>{online ? 'En ligne' : `Hors ligne${queue ? ` (${queue})` : ''}`}</Text>
        </View>
      </View>

      <View style={{ margin: 18, height: 340, borderRadius: 22, overflow: 'hidden', backgroundColor: '#0F172A' }}>
        {perm?.granted ? (
          <CameraView style={{ flex: 1 }} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={res ? undefined : ({ data }) => handle(String(data).trim().toUpperCase())} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 }}>
            <Feather name="camera-off" size={40} color="#94A3B8" />
            <Text style={{ fontFamily: F.medium, color: '#E2E8F0', textAlign: 'center' }}>L'accès à la caméra est nécessaire pour scanner les badges.</Text>
            <Btn label="Autoriser la caméra" onPress={ask} />
          </View>
        )}
        {perm?.granted && (
          <>
            <View pointerEvents="none" style={{ position: 'absolute', top: 50, bottom: 50, left: 50, right: 50, borderWidth: 3, borderColor: '#fff', borderRadius: 20, opacity: 0.8 }} />
            <Pressable onPress={() => setTorch(!torch)} style={{ position: 'absolute', right: 12, bottom: 12, width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="zap" size={22} color={torch ? '#FCD34D' : '#fff'} />
            </Pressable>
          </>
        )}
      </View>

      <View style={{ paddingHorizontal: 18, flexDirection: 'row', gap: 10 }}>
        <TextInput value={manual} onChangeText={setManual} placeholder="Code manuel (ex : KN-0001)" autoCapitalize="characters"
          style={{ flex: 1, height: 50, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, fontFamily: F.regular, fontSize: 16 }} />
        <Btn label="Valider" onPress={() => handle(manual.trim().toUpperCase())} disabled={!manual.trim()} />
      </View>
      {res && <Result res={res} onClose={close} />}
    </View>
  );
}
