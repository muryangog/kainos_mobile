import React from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { C, F, KEYWORD, getWebUrl, money } from '../config';
import { Card } from '../ui';

export default function PassModal({ visible, record, onClose }) {
  const insets = useSafeAreaInsets();
  if (!visible || !record) return null;

  const isPending = record.status !== 'confirmed';
  const statusText = isPending ? 'En attente de confirmation par le trésorier' : 'Confirmé';
  const statusBg = isPending ? C.amber : C.brand;

  const passToken = record.passToken || record.pass_token || record.data?.passToken || '';
  const tokenPart = passToken ? `&t=${encodeURIComponent(passToken)}` : '';
  const baseUrl = getWebUrl();
  const passUrl = `${baseUrl}/pass?id=${encodeURIComponent(record.id)}${tokenPart}`;

  // Numéro du participant au format international (8 chiffres burundais -> 257XXXXXXXX)
  const digits = String(record.phone || '').replace(/\D/g, '').replace(/^00/, '');
  const intl = digits.length === 8 ? `257${digits}` : digits;
  const message = `Bonjour ${record.name || ''}, voici votre pass Kainos (${record.id}) :\n${passUrl}\nMot-clé : ${KEYWORD}`;
  const siteNotConfigured = /localhost|127\.0\.0\.1|192\.168\.|example\.com/i.test(baseUrl);

  const openWhatsApp = async () => {
    try { await Linking.openURL(`https://wa.me/${intl}?text=${encodeURIComponent(message)}`); }
    catch (e) { Alert.alert('WhatsApp indisponible', "Utilisez « Autres applications » pour envoyer le pass."); }
  };
  const openSms = async () => {
    try { await Linking.openURL(`sms:${intl ? `+${intl}` : ''}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`); }
    catch (e) { Alert.alert('SMS indisponible', "Utilisez « Autres applications » pour envoyer le pass."); }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: `Pass Kainos - ${record.name || record.id}`,
        message: `Pass d'accès Kainos pour ${record.name || record.id} :\n${passUrl}`,
        url: passUrl,
      });
    } catch (e) {
      // Ignorer l'annulation
    }
  };

  const paymentLabel = Number(record.amount || 0) > 0
    ? `${money(record.amount)} • ${record.paymentMethod || record.platform || 'Payé'}`
    : 'Sans don';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: C.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '92%',
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          {/* En-tête */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
            }}
          >
            <Text style={{ fontFamily: F.bold, fontSize: 18, color: C.text }}>Pass du participant</Text>
            <Pressable
              onPress={onClose}
              style={{ padding: 6, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border }}
            >
              <Feather name="x" size={20} color={C.muted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
            {/* Fiche informations */}
            <Card style={{ padding: 18, gap: 8 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 22, color: C.text }}>{record.name || 'Inconnu'}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.muted }}>
                Identifiant : <Text style={{ fontFamily: F.bold, color: C.text }}>{record.id}</Text>
              </Text>
              <Text style={{ fontFamily: F.regular, fontSize: 14, color: C.muted }}>
                Pass : {record.passType || 'Public'} {record.place ? `• Place ${record.place}` : ''}
              </Text>
              <Text style={{ fontFamily: F.regular, fontSize: 14, color: C.muted }}>
                Montant : {paymentLabel}
              </Text>
              {!!record.phone && (
                <Text style={{ fontFamily: F.regular, fontSize: 14, color: C.muted }}>
                  Téléphone : {record.phone}
                </Text>
              )}

              <View
                style={{
                  marginTop: 10,
                  backgroundColor: statusBg,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: F.bold, fontSize: 15, color: '#fff', textAlign: 'center' }}>
                  {statusText}
                </Text>
              </View>
            </Card>

            {/* QR Code */}
            <Card style={{ alignItems: 'center', paddingVertical: 22, gap: 12 }}>
              <QRCode value={String(record.id || 'kainos-pass')} size={190} backgroundColor="#fff" />
              <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.text, letterSpacing: 1 }}>{KEYWORD}</Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.muted, textAlign: 'center' }}>
                Ce QR code est scanné à l’entrée de l’événement
              </Text>
            </Card>

            {siteNotConfigured && (
              <Text style={{ fontFamily: F.medium, color: '#B45309', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12 }}>
                L'adresse publique du site n'est pas configurée : le lien ci-dessous ne s'ouvrira pas. Ouvrez le dashboard déployé une fois, puis synchronisez l'application.
              </Text>
            )}
            <Text selectable style={{ fontFamily: F.regular, fontSize: 12, color: C.muted, textAlign: 'center' }}>{passUrl}</Text>

            {/* Renvoyer le pass au participant */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={openWhatsApp} disabled={!intl} style={{ flex: 1, height: 52, borderRadius: 14, backgroundColor: C.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: intl ? 1 : 0.5 }}>
                <Feather name="message-circle" size={18} color="#fff" />
                <Text style={{ fontFamily: F.medium, fontSize: 15, color: '#fff' }}>WhatsApp</Text>
              </Pressable>
              <Pressable onPress={openSms} disabled={!intl} style={{ flex: 1, height: 52, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: C.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: intl ? 1 : 0.5 }}>
                <Feather name="smartphone" size={18} color={C.brandDark} />
                <Text style={{ fontFamily: F.medium, fontSize: 15, color: C.brandDark }}>SMS</Text>
              </Pressable>
            </View>
            <Pressable onPress={handleShare} style={{ height: 48, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Feather name="share-2" size={18} color={C.text} />
              <Text style={{ fontFamily: F.medium, fontSize: 15, color: C.text }}>Autres applications (e-mail, Telegram...)</Text>
            </Pressable>

            {/* Bouton Fermer */}
            <Pressable
              onPress={onClose}
              style={{
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 14,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: F.medium, fontSize: 15, color: C.text }}>Fermer</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
