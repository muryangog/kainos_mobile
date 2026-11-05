import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { C, F } from './config';

export const Btn = ({ label, onPress, kind = 'primary', icon, style, disabled }) => (
  <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [{
    height: 50, borderRadius: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: kind === 'primary' ? C.brand : C.card, borderWidth: kind === 'primary' ? 0 : 1, borderColor: C.border,
    opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
  }, style]}>
    {icon}
    <Text style={{ fontFamily: F.medium, fontSize: 16, color: kind === 'primary' ? '#fff' : C.text }}>{label}</Text>
  </Pressable>
);

export const Card = ({ children, style }) => (
  <View style={[{ backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16 }, style]}>{children}</View>
);

export const Title = ({ children }) => <Text style={{ fontFamily: F.bold, fontSize: 26, color: C.text, marginBottom: 12 }}>{children}</Text>;
export const Label = ({ children }) => <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.muted, marginBottom: 6 }}>{children}</Text>;
