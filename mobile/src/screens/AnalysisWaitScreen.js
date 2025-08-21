// mobile/src/screens/AnalysisWaitScreen.js
import React, { useContext, useEffect } from 'react';
import { View, Text, ActivityIndicator, Button } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useAnalysisGate } from '../hook/useAnalysisGate';

export default function AnalysisWaitScreen({ apiBase }) {
  const route = useRoute();
  const navigation = useNavigation();
  const analysisId = route.params?.analysisId;

  const { token, user } = useContext(AuthContext);
  const doctorId = user?.id;

  const { status, resultsReady, error, refresh } = useAnalysisGate({
    apiBase,
    token,
    doctorId,
    analysisId,
  });

  useEffect(() => {
    if (resultsReady) {
      navigation.replace('AnalysisResult', { analysisId });
    }
  }, [resultsReady, analysisId, navigation]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 8 }}>Processando análise com IA…</Text>
      <Text style={{ marginBottom: 16 }}>Status: {status}</Text>
      <ActivityIndicator size="large" />
      <View style={{ height: 16 }} />
      <Button title="Atualizar agora" onPress={refresh} />
      {error ? <Text style={{ color: 'orange', marginTop: 8 }}>{error}</Text> : null}
    </View>
  );
}
