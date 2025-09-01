import React from 'react';
import { Image, View, Text, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type Props = { uri?: string|null; name?: string; size?: number; onPress?:()=>void; ring?: boolean; };

export default function Avatar({ uri, name='', size=40, onPress, ring }: Props) {
  const { theme } = useTheme();
  const initials = name.trim().split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()||'').join('');
  const content = uri ? (
    <Image source={{ uri }} style={{ width:size, height:size, borderRadius:size/2 }} />
  ) : (
    <View style={{ width:size, height:size, borderRadius:size/2, backgroundColor: theme.colors.placeholder+'55', alignItems:'center', justifyContent:'center' }}>
      <Text style={{ color: theme.colors.text+'CC', fontWeight:'700' }}>{initials}</Text>
    </View>
  );
  const wrap = ring
    ? { padding:2, borderRadius:(size+4)/2, borderWidth:2, borderColor: theme.colors.primary+'66' }
    : null;

  const Body = (
    <View style={wrap || undefined}>{content}</View>
  );

  return onPress ? <Pressable onPress={onPress} hitSlop={8}>{Body}</Pressable> : Body;
}
