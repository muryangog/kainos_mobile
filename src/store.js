import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kainos-agent-v1';
export const load = async () => { try { return JSON.parse(await AsyncStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
export const save = async (state) => { try { await AsyncStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };
