import { supabase } from './supabase';

// Erreur réseau (téléphone hors ligne) ou refus du serveur ?
export const isNetworkError = (e) => !!e && (!e.code && /network|fetch|timeout|failed/i.test(String(e.message || e)));

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) {
    if (isNetworkError(error)) throw new Error('Connexion impossible : vérifiez internet.');
    throw new Error('E-mail ou mot de passe incorrect.');
  }
  return data.user;
}

// Profil de l'agent créé depuis le dashboard (nom, statut, changement de mot de passe obligatoire).
export async function loadAgent(userId) {
  const { data, error } = await supabase.from('agents').select('first_name, last_name, email, status, must_change_password').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Ce compte n'est pas un compte agent.");
  if (data.status !== 'active') throw new Error('Compte désactivé. Contactez un administrateur.');
  return { name: [data.first_name, data.last_name].filter(Boolean).join(' ') || data.email, email: data.email, mustChange: data.must_change_password };
}

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  await supabase.rpc('password_changed');
}

export async function registerPerson(fields) {
  const isOnline = typeof navigator !== 'undefined' && 'onLine' in navigator ? navigator.onLine : true;
  if (!isOnline) {
    throw new Error('Connexion requise pour enregistrer et encaisser');
  }

  const payload = {
    p_name: String(fields.name || '').trim(),
    p_phone: String(fields.phone || '').trim(),
    p_email: String(fields.email || '').trim(),
    p_pass_type: String(fields.passType || 'Public').trim(),
    p_place: String(fields.place || '').trim(),
    p_amount: Number(fields.amount || 0),
    p_method: String(fields.paymentMethod || fields.method || '').trim(),
    p_other: String(fields.otherDetail || fields.other || '').trim(),
    p_ref: String(fields.reference || fields.ref || '').trim(),
    p_device: String(fields.device || '').trim(),
  };

  let data, error;
  try {
    const res = await supabase.rpc('register_by_agent', payload);
    data = res.data;
    error = res.error;
  } catch (e) {
    if (isNetworkError(e) || /network|fetch|timeout|failed/i.test(String(e.message || e))) {
      throw new Error('Connexion requise pour enregistrer et encaisser');
    }
    throw e;
  }

  if (error) {
    const msg = String(error.message || '').toLowerCase();
    if (/not_allowed|disabled|desactiv|inactive|compte.*désactiv|compte.*desactiv/i.test(error.message || '')) {
      await signOut().catch(() => {});
      throw Object.assign(new Error('Compte désactivé. Déconnectez-vous et contactez l’administrateur.'), { status: 403 });
    }
    if (isNetworkError(error) || /network|fetch|timeout|failed/i.test(msg)) {
      throw new Error('Connexion requise pour enregistrer et encaisser');
    }
    if (/duplicate|already.*registered|déjà enregistré|deja.*enregistre|numéro.*déjà|phone.*exists|numero.*deja/i.test(msg)) {
      throw new Error('Ce numéro est déjà enregistré. Ouvrez l’onglet Recherche pour vérifier la fiche.');
    }
    if (/vip.*amount|amount.*required|montant.*requis|montant.*vip/i.test(msg)) {
      throw new Error('Le montant est requis pour un pass VIP.');
    }
    if (/payment.*method|moyen.*paiement|method.*required|missing.*method/i.test(msg)) {
      throw new Error('Le moyen de paiement est obligatoire.');
    }
    throw new Error(error.message || 'Enregistrement impossible.');
  }

  if (data && data.ok === false) {
    const msg = String(data.msg || 'Enregistrement impossible.');
    if (/not_allowed|disabled|desactiv|inactive|compte.*désactiv|compte.*desactiv/i.test(msg)) {
      await signOut().catch(() => {});
      throw Object.assign(new Error('Compte désactivé. Déconnectez-vous et contactez l’administrateur.'), { status: 403 });
    }
    if (/duplicate|already.*registered|déjà enregistré|deja.*enregistre|numéro.*déjà|phone.*exists|numero.*deja/i.test(msg)) {
      throw new Error('Ce numéro est déjà enregistré. Ouvrez l’onglet Recherche pour vérifier la fiche.');
    }
    if (/vip.*amount|amount.*required|montant.*requis|montant.*vip/i.test(msg)) {
      throw new Error('Le montant est requis pour un pass VIP.');
    }
    if (/payment.*method|moyen.*paiement|method.*required|missing.*method/i.test(msg)) {
      throw new Error('Le moyen de paiement est obligatoire.');
    }
    throw new Error(msg);
  }

  return data;
}

export const signOut = () => supabase.auth.signOut();

// Liste complète des participants (lecture autorisée aux agents actifs) : sert à la recherche, aux stats et au mode hors ligne.
export async function pullRows() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('participants').select('id, data').order('id').range(from, from + 999);
    if (error) throw error;
    out.push(...data.map((r) => ({ ...r.data, id: r.id })));
    if (data.length < 1000) break;
  }
  return out;
}

// Une seule règle côté serveur pour le scan ET la validation après recherche manuelle.
export async function scanRemote(code, device) {
  const { data, error } = await supabase.rpc('scan_entry', { p_code: code, p_device: device });
  if (error) {
    if (/not_allowed/.test(error.message)) throw Object.assign(new Error('Compte non autorisé ou désactivé'), { status: 403 });
    if (isNetworkError(error)) throw error;
    throw Object.assign(new Error(error.message), { status: 500 });
  }
  return data;
}

// Décision locale (hors ligne) avec les mêmes règles ; rejouée au retour du réseau.
export function scanLocal(rows, code) {
  const rec = rows.find((r) => r.id === code);
  if (!rec) return { ok: false, msg: 'Code inconnu', record: null };
  if (rec.status !== 'confirmed') return { ok: false, msg: rec.passType === 'VIP' ? 'Paiement non validé par la trésorerie' : 'Badge non valide', record: rec };
  if (rec.entered) return { ok: false, msg: 'Double scan / fraude détectée', record: rec };
  const record = { ...rec, entered: true };
  return { ok: true, msg: 'Entrée validée', record, rows: rows.map((r) => (r.id === code ? record : r)) };
}
