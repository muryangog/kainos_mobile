import React from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F } from '../config';
import { Card, Title } from '../ui';

export default function HistoryScreen({ rows, log, onRefresh, refreshing }) {
  const entered = rows.filter((r) => r.entered).length;
  const rate = rows.length ? Math.round((entered / rows.length) * 100) : 0;
  const stats = [['Entrées', entered], ['Inscrits', rows.length], ['Taux', `${rate} %`]];
  return (
    <FlatList
      data={log}
      keyExtractor={(_, i) => String(i)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      contentContainerStyle={{ padding: 18, gap: 10 }}
      ListHeaderComponent={(
        <View style={{ marginBottom: 6 }}>
          <Title>Présences</Title>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            {stats.map(([l, v]) => (
              <Card key={l} style={{ flex: 1, padding: 14 }}>
                <Text style={{ fontFamily: F.regular, color: C.muted }}>{l}</Text>
                <Text style={{ fontFamily: F.bold, fontSize: 24, color: C.text }}>{v}</Text>
              </Card>
            ))}
          </View>
          <Text style={{ fontFamily: F.bold, fontSize: 18, color: C.text }}>Mes scans récents</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={{ fontFamily: F.regular, color: C.muted }}>Aucun scan pour le moment.</Text>}
      renderItem={({ item }) => (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          <Feather name={item.ok ? 'check-circle' : 'alert-triangle'} size={24} color={item.ok ? C.brand : C.red} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 16, color: C.text }}>{item.name || 'Inconnu'} ({item.code})</Text>
            <Text style={{ fontFamily: F.regular, color: item.ok ? C.muted : C.red }}>{item.msg}</Text>
          </View>
          <Text style={{ fontFamily: F.regular, color: C.muted }}>{item.time}</Text>
        </Card>
      )}
    />
  );
}
