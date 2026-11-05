import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, Share, Switch, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { C, F, KEYWORD, PAYMENT_METHOD_GROUPS, WEB_URL, money } from '../config';
import { Btn, Card, Title } from '../ui';
import { supabase } from '../supabase';

const makeInitialForm = () => ({
  passType: 'VIP',
  firstName: '',
  lastName: '',
  phoneDigits: '',
  email: '',
  place: '',
  hasDonation: true,
  amount: '',
  paymentMethod: '',
  otherDetail: '',
  reference: '',
});

const toDisplayName = (firstName, lastName) => [firstName, lastName].filter(Boolean).join(' ').trim();

const getRecordName = (record) => record?.name || record?.full_name || [record?.first_name, record?.last_name].filter(Boolean).join(' ') || 'Inconnu';

const getPaymentLabel = (record) => {
  if (!record) return '—';
  if (record.paymentMethod) return record.paymentMethod;
  if (record.platform) return record.platform;
  if (record.method) return record.method;
  return Number(record.amount || 0) > 0 ? '—' : 'Aucun';
};

const formatRecordTime = (record) => {
  const raw = record?.createdAt || record?.created_at || record?.time;
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
  } catch (e) {
    // fallback
  }
  return String(raw);
};

export default function RegisterScreen({ rows = [], device, onRegister, onRefresh, onOpenSearch, onBack }) {
  const [view, setView] = useState('new');
  const [form, setForm] = useState(makeInitialForm());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [agentId, setAgentId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setAgentId(data?.user?.id || null);
    }).catch(() => {
      if (active) setAgentId(null);
    });
    return () => { active = false; };
  }, []);

  const records = useMemo(() => {
    if (!agentId) return [];
    return rows.filter((record) => {
      const idValues = [
        record?.createdBy?.id,
        record?.created_by,
        record?.createdById,
        record?.created_by_id,
        record?.createdBy?.userId,
      ];
      return idValues.includes(agentId) || (typeof record?.createdBy === 'string' && record.createdBy === agentId);
    });
  }, [rows, agentId]);

  const totals = useMemo(() => {
    const collected = records.reduce((sum, record) => sum + (Number(record.amount || 0) || 0), 0);
    const confirmed = records.filter((record) => record.status === 'confirmed').reduce((sum, record) => sum + (Number(record.amount || 0) || 0), 0);
    const pending = records.filter((record) => record.status !== 'confirmed').reduce((sum, record) => sum + (Number(record.amount || 0) || 0), 0);
    return { collected, confirmed, pending };
  }, [records]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = () => {
    const fullName = toDisplayName(form.firstName, form.lastName).trim();
    if (!fullName) return 'Le nom et le prénom sont obligatoires.';
    if (!/^[0-9]{8}$/.test(form.phoneDigits)) return 'Le téléphone doit comporter 8 chiffres après +257.';
    if (form.passType === 'VIP' && !form.place.trim()) return 'La place est obligatoire pour un pass VIP.';
    if (form.passType === 'VIP') {
      if (!form.amount || Number(form.amount) <= 0) return 'Le montant est requis pour un pass VIP.';
      if (!form.paymentMethod) return 'Le moyen de paiement est obligatoire.';
      if (form.paymentMethod === 'Autre' && !form.otherDetail.trim()) return 'Précisez le moyen de paiement choisi.';
    } else if (form.hasDonation) {
      if (!form.amount || Number(form.amount) <= 0) return 'Le montant du don est requis.';
      if (!form.paymentMethod) return 'Le moyen de paiement est obligatoire.';
      if (form.paymentMethod === 'Autre' && !form.otherDetail.trim()) return 'Précisez le moyen de paiement choisi.';
    }
    return '';
  };

  const handleConfirm = () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      ...form,
      name: toDisplayName(form.firstName, form.lastName),
      phone: `+257${form.phoneDigits}`,
      device,
      amount: (form.passType === 'VIP' || form.hasDonation) ? Number(form.amount || 0) : 0,
      paymentMethod: (form.passType === 'VIP' || form.hasDonation) ? form.paymentMethod : '',
      otherDetail: (form.passType === 'VIP' || form.hasDonation) && form.paymentMethod === 'Autre' ? form.otherDetail : '',
      reference: form.reference || '',
      email: form.email.trim(),
      place: form.passType === 'VIP' ? form.place.trim() : '',
    };

    setConfirmation(payload);
  };

  const handleSubmit = async () => {
    setBusy(true);
    setError('');
    try {
      const record = await onRegister({
        name: confirmation.name,
        phone: confirmation.phone,
        email: confirmation.email,
        passType: confirmation.passType,
        place: confirmation.place,
        amount: confirmation.amount,
        paymentMethod: confirmation.paymentMethod,
        otherDetail: confirmation.otherDetail,
        reference: confirmation.reference,
        device: confirmation.device,
      });

      const normalized = record && (record.record || record);
      setReceipt(normalized || {
        id: 'KA-0000',
        name: confirmation.name,
        passType: confirmation.passType,
        amount: confirmation.amount,
        paymentMethod: confirmation.paymentMethod,
        status: confirmation.passType === 'VIP' || confirmation.amount > 0 ? 'pending' : 'confirmed',
      });
      setForm(makeInitialForm());
      setConfirmation(null);
    } catch (e) {
      setError(String(e.message || 'Enregistrement impossible.'));
      setConfirmation(null);
    } finally {
      setBusy(false);
    }
  };

  const sharePass = async () => {
    if (!receipt || !receipt.id) return;
    const tokenPart = receipt.passToken ? `&t=${encodeURIComponent(receipt.passToken)}` : '';
    const url = `${WEB_URL}/pass?id=${encodeURIComponent(receipt.id)}${tokenPart}`;
    try {
      await Share.share({ message: url, url });
    } catch (e) {
      // Annulation du partage ignorée
    }
  };

  const handlePullRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) await onRefresh();
    setRefreshing(false);
  };

  // REÇU APRÈS ENREGISTREMENT
  if (receipt) {
    const isPending = receipt.status !== 'confirmed';
    const statusText = isPending ? 'En attente de confirmation par le trésorier' : 'Confirmé';
    const statusBg = isPending ? C.amber : C.brand;

    return (
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        <Title>Reçu</Title>
        <Card style={{ padding: 20, gap: 10 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 22, color: C.text }}>{receipt.name || 'Inconnu'}</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 15, color: C.muted }}>Identifiant : {receipt.id || 'N/A'}</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 15, color: C.muted }}>
            Type : {receipt.passType || 'Public'} {receipt.place ? `• Place ${receipt.place}` : ''}
          </Text>
          <Text style={{ fontFamily: F.regular, fontSize: 15, color: C.muted }}>
            Montant et moyen : {Number(receipt.amount || 0) > 0 ? `${money(receipt.amount)} • ${receipt.paymentMethod || receipt.platform || 'Payé'}` : 'Sans don'}
          </Text>
          <View style={{ marginTop: 10, backgroundColor: statusBg, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' }}>
            <Text style={{ fontFamily: F.bold, fontSize: 17, color: '#fff', textAlign: 'center' }}>{statusText}</Text>
          </View>
        </Card>

        <Card style={{ alignItems: 'center', paddingVertical: 20, gap: 12 }}>
          <QRCode value={String(receipt.id || 'kainos-pass')} size={190} backgroundColor="#fff" />
          <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.text, letterSpacing: 1 }}>{KEYWORD}</Text>
        </Card>

        <Pressable onPress={sharePass} style={{ backgroundColor: C.brand, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.medium, fontSize: 16, color: '#fff' }}>Partager le pass</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={() => { setReceipt(null); setView('new'); }} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontFamily: F.medium, fontSize: 15, color: C.text }}>Nouvel enregistrement</Text>
          </Pressable>
          <Pressable onPress={() => { setReceipt(null); if (onBack) onBack(); }} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontFamily: F.medium, fontSize: 15, color: C.text }}>Retour</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ÉCRAN DE CONFIRMATION AVANT ENVOI
  if (confirmation) {
    return (
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <Title>Vérifiez : nom, montant, moyen</Title>
        <Card style={{ padding: 18, gap: 12 }}>
          <View>
            <Text style={{ fontFamily: F.medium, color: C.muted, fontSize: 13 }}>Nom</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 20, color: C.text }}>{confirmation.name}</Text>
          </View>
          <View>
            <Text style={{ fontFamily: F.medium, color: C.muted, fontSize: 13 }}>Montant</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 18, color: C.text }}>
              {confirmation.amount > 0 ? money(confirmation.amount) : 'Sans don'}
            </Text>
          </View>
          <View>
            <Text style={{ fontFamily: F.medium, color: C.muted, fontSize: 13 }}>Moyen</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 18, color: C.text }}>
              {confirmation.paymentMethod || 'Aucun'}
            </Text>
          </View>
        </Card>

        {error ? <Text style={{ color: C.red, fontFamily: F.medium, fontSize: 14 }}>{error}</Text> : null}

        <Btn label={busy ? 'Enregistrement...' : 'Confirmer l’encaissement'} onPress={handleSubmit} disabled={busy} />
        <Btn label="Retour" kind="secondary" onPress={() => setConfirmation(null)} />
      </ScrollView>
    );
  }

  // VUE PRINCIPALE : ONGLETS NOUVEAU / MES ENREGISTREMENTS
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 6, marginHorizontal: 18, marginTop: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border }}>
        <Pressable onPress={() => setView('new')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: view === 'new' ? C.brand : 'transparent', alignItems: 'center' }}>
          <Text style={{ fontFamily: F.medium, color: view === 'new' ? '#fff' : C.text }}>Nouveau</Text>
        </Pressable>
        <Pressable onPress={() => setView('mine')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: view === 'mine' ? C.brand : 'transparent', alignItems: 'center' }}>
          <Text style={{ fontFamily: F.medium, color: view === 'mine' ? '#fff' : C.text }}>Mes enregistrements</Text>
        </Pressable>
      </View>

      {view === 'new' ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28, gap: 14 }} keyboardShouldPersistTaps="handled">
          <Title>Nouveau</Title>

          {/* Type de pass : VIP / Public */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {['VIP', 'Public'].map((type) => {
              const active = form.passType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => {
                    setForm((prev) => ({
                      ...prev,
                      passType: type,
                      hasDonation: type === 'VIP' ? true : prev.hasDonation,
                    }));
                    setError('');
                  }}
                  style={{
                    flex: 1,
                    height: 58,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: active ? C.brand : C.border,
                    backgroundColor: active ? C.soft : '#fff',
                  }}
                >
                  <Text style={{ fontFamily: F.bold, fontSize: 18, color: active ? C.brandDark : C.text }}>
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Nom et prénom */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.medium, color: C.muted, marginBottom: 6 }}>Nom</Text>
              <TextInput
                value={form.lastName}
                onChangeText={(value) => updateField('lastName', value)}
                placeholder="Nom"
                style={inputStyle}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.medium, color: C.muted, marginBottom: 6 }}>Prénom</Text>
              <TextInput
                value={form.firstName}
                onChangeText={(value) => updateField('firstName', value)}
                placeholder="Prénom"
                style={inputStyle}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Téléphone (+257, 8 chiffres) */}
          <View>
            <Text style={{ fontFamily: F.medium, color: C.muted, marginBottom: 6 }}>Téléphone</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 12 }}>
              <Text style={{ fontFamily: F.medium, color: C.text, fontSize: 16 }}>+257</Text>
              <TextInput
                value={form.phoneDigits}
                onChangeText={(value) => updateField('phoneDigits', value.replace(/\D/g, '').slice(0, 8))}
                keyboardType="numeric"
                placeholder="XXXXXXXX"
                style={{ flex: 1, height: 50, paddingLeft: 10, fontFamily: F.regular, fontSize: 16, color: C.text }}
              />
            </View>
          </View>

          {/* E-mail (optionnel) */}
          <View>
            <Text style={{ fontFamily: F.medium, color: C.muted, marginBottom: 6 }}>E-mail (optionnel)</Text>
            <TextInput
              value={form.email}
              onChangeText={(value) => updateField('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="nom@example.com"
              style={inputStyle}
            />
          </View>

          {/* Place si VIP */}
          {form.passType === 'VIP' && (
            <View>
              <Text style={{ fontFamily: F.medium, color: C.muted, marginBottom: 6 }}>Place (VIP)</Text>
              <TextInput
                value={form.place}
                onChangeText={(value) => updateField('place', value)}
                placeholder="Ex. Rang A - Siège 12"
                style={inputStyle}
              />
            </View>
          )}

          {/* Interrupteur « Cette personne fait un don » */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12 }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ fontFamily: F.medium, fontSize: 16, color: C.text }}>Cette personne fait un don</Text>
              {form.passType === 'VIP' && (
                <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.muted }}>Obligatoire pour les pass VIP</Text>
              )}
            </View>
            <Switch
              value={form.passType === 'VIP' ? true : form.hasDonation}
              onValueChange={(value) => updateField('hasDonation', value)}
              disabled={form.passType === 'VIP'}
              trackColor={{ false: '#CBD5E1', true: C.brand }}
            />
          </View>

          {/* Bloc don et paiement si actif */}
          {(form.passType === 'VIP' || form.hasDonation) && (
            <View style={{ gap: 14 }}>
              <View>
                <Text style={{ fontFamily: F.medium, color: C.muted, marginBottom: 6 }}>Montant (BIF)</Text>
                <TextInput
                  value={form.amount}
                  onChangeText={(value) => updateField('amount', value.replace(/[^0-9]/g, '').slice(0, 12))}
                  keyboardType="numeric"
                  placeholder="Ex. 100000"
                  style={inputStyle}
                />
              </View>

              {/* Liste déroulante regroupée : Mobile money, Banque, Espèces, Autre */}
              <View>
                <Text style={{ fontFamily: F.medium, color: C.muted, marginBottom: 6 }}>Moyen de paiement</Text>
                <Pressable
                  onPress={() => setDropdownOpen(true)}
                  style={{
                    backgroundColor: '#fff',
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 14,
                    height: 50,
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontFamily: F.regular, fontSize: 16, color: form.paymentMethod ? C.text : C.muted }}>
                    {form.paymentMethod || 'Sélectionnez un moyen de paiement'}
                  </Text>
                  <Feather name="chevron-down" size={20} color={C.muted} />
                </Pressable>
              </View>

              {/* Modal liste déroulante regroupée */}
              <Modal visible={dropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
                <Pressable onPress={() => setDropdownOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
                  <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: 18, maxHeight: '80%', padding: 18 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 10 }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 18, color: C.text }}>Moyen de paiement</Text>
                      <Pressable onPress={() => setDropdownOpen(false)}>
                        <Feather name="x" size={22} color={C.muted} />
                      </Pressable>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {PAYMENT_METHOD_GROUPS.map((group) => (
                        <View key={group.group} style={{ marginBottom: 16 }}>
                          <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                            {group.group}
                          </Text>
                          <View style={{ gap: 4 }}>
                            {group.methods.map((method) => {
                              const isSelected = form.paymentMethod === method;
                              return (
                                <Pressable
                                  key={method}
                                  onPress={() => {
                                    updateField('paymentMethod', method);
                                    setDropdownOpen(false);
                                  }}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingVertical: 12,
                                    paddingHorizontal: 12,
                                    borderRadius: 10,
                                    backgroundColor: isSelected ? C.soft : 'transparent',
                                  }}
                                >
                                  <Text style={{ fontFamily: F.medium, fontSize: 16, color: isSelected ? C.brandDark : C.text }}>
                                    {method}
                                  </Text>
                                  {isSelected && <Feather name="check" size={18} color={C.brand} />}
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </Pressable>
                </Pressable>
              </Modal>

              {/* Précision obligatoire si « Autre » */}
              {form.paymentMethod === 'Autre' && (
                <View>
                  <Text style={{ fontFamily: F.medium, color: C.muted, marginBottom: 6 }}>Précision (obligatoire)</Text>
                  <TextInput
                    value={form.otherDetail}
                    onChangeText={(value) => updateField('otherDetail', value)}
                    placeholder="Précisez le moyen de paiement"
                    style={inputStyle}
                  />
                </View>
              )}

              {/* Référence transactionnelle (optionnelle) */}
              <View>
                <Text style={{ fontFamily: F.medium, color: C.muted, marginBottom: 6 }}>Référence de la transaction (optionnelle)</Text>
                <TextInput
                  value={form.reference}
                  onChangeText={(value) => updateField('reference', value)}
                  placeholder="Ex. Réf. mobile money ou virement"
                  style={inputStyle}
                />
              </View>
            </View>
          )}

          {/* Affichage des erreurs */}
          {error ? (
            <View style={{ gap: 10, marginTop: 4 }}>
              <Text style={{ color: C.red, fontFamily: F.medium, fontSize: 14 }}>{error}</Text>
              {(error.toLowerCase().includes('déjà enregistré') || error.toLowerCase().includes('deja') || error.toLowerCase().includes('recherche')) && (
                <Pressable onPress={onOpenSearch} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.brand, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ fontFamily: F.medium, color: C.brandDark, fontSize: 15 }}>Ouvrir l’onglet Recherche</Text>
                </Pressable>
              )}
            </View>
          ) : null}

          <Btn label="Vérifier l’encaissement" onPress={handleConfirm} />
        </ScrollView>
      ) : (
        /* VUE MES ENREGISTREMENTS */
        <FlatList
          data={records.slice().sort((a, b) => Number(new Date(b.createdAt || 0)) - Number(new Date(a.createdAt || 0)))}
          keyExtractor={(item, index) => String(item.id || index)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handlePullRefresh} tintColor={C.brand} />}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: 10 }}
          ListHeaderComponent={(
            <View style={{ gap: 12, marginBottom: 8 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 24, color: C.text }}>Mes enregistrements</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Card style={{ flex: 1, padding: 12 }}>
                  <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.muted }}>Collecté</Text>
                  <Text style={{ fontFamily: F.bold, fontSize: 17, color: C.text, marginTop: 2 }}>{money(totals.collected)}</Text>
                </Card>
                <Card style={{ flex: 1, padding: 12 }}>
                  <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.muted }}>Confirmé par la trésorerie</Text>
                  <Text style={{ fontFamily: F.bold, fontSize: 17, color: C.text, marginTop: 2 }}>{money(totals.confirmed)}</Text>
                </Card>
                <Card style={{ flex: 1, padding: 12 }}>
                  <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.muted }}>À remettre au trésorier</Text>
                  <Text style={{ fontFamily: F.bold, fontSize: 17, color: C.amber, marginTop: 2 }}>{money(totals.pending)}</Text>
                </Card>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ fontFamily: F.regular, color: C.muted, textAlign: 'center', marginTop: 20 }}>
              Aucun enregistrement pour le moment.
            </Text>
          }
          renderItem={({ item }) => {
            const isPending = item.status !== 'confirmed';
            return (
              <Card style={{ padding: 14, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 17, color: C.text }}>{getRecordName(item)}</Text>
                    <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.muted }}>{item.id}</Text>
                  </View>
                  <View style={{ backgroundColor: isPending ? '#FEF3C7' : C.soft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontFamily: F.medium, fontSize: 12, color: isPending ? '#B45309' : C.brandDark }}>
                      {isPending ? 'En attente' : 'Confirmé'}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontFamily: F.regular, color: C.muted, fontSize: 14 }}>
                    {money(item.amount || 0)} • {getPaymentLabel(item)}
                  </Text>
                  <Text style={{ fontFamily: F.regular, color: C.muted, fontSize: 13 }}>
                    {formatRecordTime(item)}
                  </Text>
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const inputStyle = {
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: 14,
  minHeight: 50,
  paddingHorizontal: 12,
  fontFamily: F.regular,
  fontSize: 16,
  color: C.text,
};
