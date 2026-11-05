import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, SafeAreaView, StatusBar, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { C, F, DEVICES } from './src/config';
import { load, save } from './src/store';
import { supabase } from './src/supabase';
import { isNetworkError, loadAgent, pullRows, registerPerson, scanLocal, scanRemote, signOut } from './src/api';
import LoginScreen from './src/screens/LoginScreen';
import ScanScreen from './src/screens/ScanScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SearchScreen from './src/screens/SearchScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const TABS = [['scan', 'Scanner', 'camera'], ['register', 'Enregistrer', 'user-plus'], ['search', 'Recherche', 'search'], ['history', 'Présences', 'users'], ['settings', 'Réglages', 'settings']];

export default function App() {
  const [fontsLoaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold });
  const [ready, setReady] = useState(false);
  const [agent, setAgent] = useState(null);          // profil de l'agent connecté
  const [device, setDevice] = useState(DEVICES[0]);
  const [rows, setRows] = useState([]);
  const [queue, setQueue] = useState([]);
  const [log, setLog] = useState([]);
  const [online, setOnline] = useState(true);
  const [tab, setTab] = useState('scan');
  const [refreshing, setRefreshing] = useState(false);
  const queueRef = useRef([]);
  queueRef.current = queue;

  // Au démarrage : on reprend la session enregistrée (si l'agent est toujours actif).
  useEffect(() => {
    (async () => {
      const s = await load();
      setDevice(s.device || DEVICES[0]); setRows(s.rows || []); setQueue(s.queue || []); setLog(s.log || []);
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const a = await loadAgent(data.session.user.id);
          if (!a.mustChange) setAgent(a); else await signOut();
        }
      } catch (e) {
        if (!isNetworkError(e)) await signOut();
        else if (s.agent) setAgent(s.agent);        // hors ligne : on garde l'agent déjà connecté
      }
      setReady(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') setAgent(null); });
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (ready) save({ agent, device, rows, queue, log }); }, [ready, agent, device, rows, queue, log]);

  // Rejoue les scans faits hors ligne, puis recharge la liste à jour.
  const syncNow = useCallback(async () => {
    if (!agent) return false;
    try {
      const q = [...queueRef.current];
      while (q.length) {
        await scanRemote(q[0].code, q[0].device || device).catch((e) => { if (isNetworkError(e)) throw e; });
        q.shift(); setQueue([...q]);
      }
      setRows(await pullRows()); setOnline(true);
      return true;
    } catch (e) { setOnline(false); return false; }
  }, [agent, device]);

  useEffect(() => {
    if (!agent) return undefined;
    syncNow();
    const t = setInterval(syncNow, 15000);
    return () => clearInterval(t);
  }, [agent]);

  const onScan = async (code) => {
    let result;
    try {
      result = await scanRemote(code, device);
      setOnline(true);
      if (result.ok) setRows((r) => r.map((x) => (x.id === code ? result.record : x)));
    } catch (e) {
      if (e.status === 403) { await signOut(); result = { ok: false, msg: e.message, record: null }; }
      else if (e.status) result = { ok: false, msg: e.message, record: null };
      else {
        setOnline(false);
        result = scanLocal(rows, code);
        if (result.ok) setRows(result.rows);
        setQueue((q) => [...q, { code, device, at: Date.now() }]);
      }
    }
    setLog((l) => [{ ok: result.ok, msg: result.msg, code, name: result.record?.name, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }, ...l].slice(0, 100));
    return result;
  };

  const handleRegister = async (fields) => {
    try {
      const data = await registerPerson(fields);
      const record = data?.record || data || null;
      if (record) {
        const out = {
          ...record,
          id: record.id,
          name: record.name || fields.name,
          phone: record.phone || fields.phone,
          passType: record.passType || fields.passType,
          amount: Number(record.amount !== undefined ? record.amount : fields.amount || 0),
          status: record.status || (fields.passType === 'VIP' || Number(fields.amount || 0) > 0 ? 'pending' : 'confirmed'),
        };
        setRows((current) => [out, ...current.filter((item) => item.id !== out.id)]);
        return out;
      }
      return null;
    } catch (e) {
      if (e.status === 403 || /not_allowed|désactiv|desactiv/i.test(e.message)) {
        await signOut().catch(() => {});
        setAgent(null);
      }
      throw e;
    }
  };

  const logout = async () => { await signOut(); setAgent(null); setRows([]); setQueue([]); setLog([]); };

  if (!fontsLoaded || !ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.brand} /></View>;
  const session = { device, agent: agent?.name };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      {!agent ? (
        <LoginScreen initialDevice={device} onLogin={(a, d) => { setAgent(a); setDevice(d); setOnline(true); }} />
      ) : (
        <>
          <View style={{ flex: 1 }}>
            {tab === 'scan' && <ScanScreen onScan={onScan} session={session} online={online} queue={queue.length} />}
            {tab === 'register' && <RegisterScreen rows={rows} device={device} onRegister={handleRegister} onRefresh={async () => { setRefreshing(true); await syncNow(); setRefreshing(false); }} onOpenSearch={() => setTab('search')} onBack={() => setTab('scan')} />}
            {tab === 'search' && <SearchScreen rows={rows} onScan={onScan} />}
            {tab === 'history' && <HistoryScreen rows={rows} log={log} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await syncNow(); setRefreshing(false); }} />}
            {tab === 'settings' && <SettingsScreen agent={agent} device={device} setDevice={setDevice} online={online} queue={queue.length} onSync={syncNow} onLogout={logout} />}
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.border }}>
            {TABS.map(([k, label, icon]) => (
              <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 4, borderRadius: 14, backgroundColor: tab === k ? C.brand : 'transparent' }}>
                  <Feather name={icon} size={22} color={tab === k ? '#fff' : C.muted} />
                </View>
                <Text style={{ fontFamily: F.medium, fontSize: 12, color: tab === k ? C.brandDark : C.muted }}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
