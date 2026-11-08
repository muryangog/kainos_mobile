import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F } from '../config';
import { Card, Title } from '../ui';
import { Result } from './ScanScreen';
import PassModal from '../components/PassModal';

const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const digits = (v) => String(v || '').replace(/\D/g, '');

// Recherche à l'entrée par nom, numéro de téléphone ou identifiant, puis validation de l'entrée.
export default function SearchScreen({ rows, onScan }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [selectedPass, setSelectedPass] = useState(null);

  const list = useMemo(() => {
    const text = norm(q.trim());
    const d = digits(q).slice(-8);
    if (text.length < 2) return [];
    return rows.filter((r) => norm(r.name).includes(text) || norm(r.id).includes(text) || (d.length >= 3 && digits(r.phone).slice(-8).includes(d))).slice(0, 30);
  }, [q, rows]);

  const enter = async (r) => {
    setBusyId(r.id);
    const result = await onScan(r.id);
    setBusyId(null);
    setRes(result);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 18, paddingBottom: 8 }}>
        <Title>Recherche</Title>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12 }}>
          <Feather name="search" size={20} color={C.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Nom, téléphone ou code" autoCorrect={false}
            style={{ flex: 1, height: 50, paddingHorizontal: 10, fontFamily: F.regular, fontSize: 16 }} />
          {!!q && <Pressable onPress={() => setQ('')}><Feather name="x" size={20} color={C.muted} /></Pressable>}
        </View>
      </View>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 18, paddingTop: 8, paddingBottom: 30, gap: 10 }}
        ListEmptyComponent={<Text style={{ fontFamily: F.regular, color: C.muted }}>{q.trim().length < 2 ? 'Tapez au moins 2 lettres ou 3 chiffres.' : 'Aucun résultat. Vérifiez l’orthographe ou le numéro.'}</Text>}
        renderItem={({ item: r }) => {
          const blocked = r.status !== 'confirmed';
          return (
            <Card style={{ padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 18, color: C.text }}>{r.name}</Text>
                  <Text style={{ fontFamily: F.regular, color: C.muted }}>{r.id} - {r.passType}{r.place ? ` - Place ${r.place}` : ''}</Text>
                  <Text style={{ fontFamily: F.regular, color: C.muted }}>{r.phone}</Text>
                </View>
                <View style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: r.entered ? '#E2E8F0' : blocked ? '#FEF3C7' : C.soft }}>
                  <Text style={{ fontFamily: F.medium, fontSize: 13, color: r.entered ? C.muted : blocked ? '#B45309' : C.brandDark }}>{r.entered ? 'Déjà entré' : blocked ? 'Paiement en attente' : 'Peut entrer'}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => setSelectedPass(r)}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 12,
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: C.brand,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Feather name="eye" size={16} color={C.brandDark} />
                  <Text style={{ fontFamily: F.medium, color: C.brandDark, fontSize: 14 }}>Consulter / Renvoyer</Text>
                </Pressable>

                <Pressable
                  disabled={busyId === r.id}
                  onPress={() => enter(r)}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 12,
                    backgroundColor: C.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: busyId === r.id ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontFamily: F.medium, color: '#fff', fontSize: 15 }}>Valider l’entrée</Text>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />
      {res && <Result res={res} onClose={() => setRes(null)} />}
      <PassModal visible={!!selectedPass} record={selectedPass} onClose={() => setSelectedPass(null)} />
    </View>
  );
}
