// mobile/src/screens/ProfileScreen.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  Modal, ActivityIndicator, Switch, TextInput, Platform, StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';

const COLOR_FALLBACK = {
  trial: '#9CA3AF',
  monthly: '#3B82F6',
  quarterly: '#10B981',
  annual: '#8B5CF6',
};

const ProfileScreen = () => {
  const { user, setUser, logout } = useAuth();

  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);

  const [loadingSub, setLoadingSub] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingMe, setLoadingMe] = useState(true);

  const [plansModalVisible, setPlansModalVisible] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  // Modais extras
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  // Form de edição de perfil
  const [form, setForm] = useState({
    name: '', email: '', crm: '', specialty: '', phone: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Form de troca de senha
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  // Notificações (local)
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);

  // ===== LOADERS =====
  const loadSubscription = async () => {
    try {
      setLoadingSub(true);
      const { data } = await axios.get('/subscriptions');
      setSubscription(data);
    } catch (e) {
      console.error('subscription error', e?.response?.data || e.message);
      setSubscription(null);
    } finally {
      setLoadingSub(false);
    }
  };

  const loadPlans = async () => {
    try {
      setLoadingPlans(true);
      const { data } = await axios.get('/plans');
      setPlans(data?.plans || []);
    } catch (e) {
      console.error('plans error', e?.response?.data || e.message);
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadMe = async () => {
    try {
      setLoadingMe(true);
      const { data } = await axios.get('/users/me');
      setUser?.(data);
      setForm({
        name: data?.name || '',
        email: data?.email || '',
        crm: data?.crm || '',
        specialty: data?.specialty || '',
        phone: data?.phone || ''
      });
    } catch (e) {
      console.error('me error', e?.response?.data || e.message);
    } finally {
      setLoadingMe(false);
    }
  };

  useEffect(() => {
    loadMe();
    loadSubscription();
    loadPlans();
  }, []);

  useFocusEffect(useCallback(() => { loadSubscription(); }, []));

  // ===== DERIVADOS =====
  const currentPlan = useMemo(() => {
    if (!subscription?.plan) return null;
    return plans.find(p => p.id === subscription.plan) || null;
  }, [subscription, plans]);

  const planColor = (plan) => plan?.color || COLOR_FALLBACK[plan?.id] || '#3B82F6';

  const formatDate = (d) => {
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'cancelled': return '#F59E0B';
      case 'expired': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'cancelled': return 'Cancelado';
      case 'expired': return 'Expirado';
      default: return 'Inativo';
    }
  };

  const durationLabel = (plan) => {
    if (!plan) return '';
    const t = plan.durationType;
    const v = plan.durationValue;
    if (t === 'days') return `${v} dias`;
    if (t === 'months') return v === 1 ? 'por mês' : `por ${v} meses`;
    if (t === 'years') return v === 1 ? 'por ano' : `por ${v} anos`;
    return '';
  };

  const money = (plan) => {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: plan?.currency || 'BRL',
      }).format(Number(plan?.price || 0));
    } catch {
      return `R$ ${Number(plan?.price || 0).toFixed(2)}`;
    }
  };

  const used = Number(subscription?.analysisUsed || 0);
  const limit = Math.max(Number(subscription?.analysisLimit || 0), 1);
  const usedPct = Math.min(100, Math.round((used / limit) * 100));

  // ===== AÇÕES =====
  const handleUpgradePlan = (planId) => {
    if (planId === subscription?.plan) {
      Alert.alert('Aviso', 'Você já possui este plano');
      return;
    }
    const plan = plans.find(p => p.id === planId);
    Alert.alert(
      'Confirmar Upgrade',
      `Deseja alterar para o plano ${plan?.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => doUpgrade(planId) },
      ]
    );
  };

  const doUpgrade = async (planId) => {
    setUpgrading(true);
    try {
      const { data } = await axios.post('/plans/upgrade', { plan: planId });
      setSubscription(data.subscription);
      setPlansModalVisible(false);
      Alert.alert('Sucesso', 'Plano atualizado com sucesso!');
    } catch (e) {
      console.error('upgrade error', e?.response?.data || e.message);
      Alert.alert('Erro', e?.response?.data?.error || 'Erro ao atualizar plano');
    } finally {
      setUpgrading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: logout }
    ]);
  };

  const openEditProfile = () => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      crm: user?.crm || '',
      specialty: user?.specialty || '',
      phone: user?.phone || ''
    });
    setEditModalVisible(true);
  };

  const saveProfile = async () => {
    if (!form.name?.trim() || !form.email?.trim()) {
      Alert.alert('Validação', 'Nome e e-mail são obrigatórios.');
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await axios.put('/users/me', {
        name: form.name,
        email: form.email,
        crm: form.crm,
        specialty: form.specialty,
        phone: form.phone
      });
      setUser?.(data);
      setEditModalVisible(false);
      Alert.alert('Sucesso', 'Perfil atualizado!');
    } catch (e) {
      console.error('save profile error', e?.response?.data || e.message);
      Alert.alert('Erro', e?.response?.data?.error || 'Não foi possível atualizar o perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const openChangePwd = () => {
    setPwdCurrent('');
    setPwdNew('');
    setPwdConfirm('');
    setPwdModalVisible(true);
  };

  const doChangePwd = async () => {
    if (!pwdCurrent || !pwdNew || !pwdConfirm) {
      Alert.alert('Validação', 'Preencha todos os campos.');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      Alert.alert('Validação', 'Nova senha e confirmação não coincidem.');
      return;
    }
    if (pwdNew.length < 6) {
      Alert.alert('Validação', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setChangingPwd(true);
    try {
      await axios.post('/users/change-password', { currentPassword: pwdCurrent, newPassword: pwdNew });
      setPwdModalVisible(false);
      Alert.alert('Sucesso', 'Senha alterada!');
    } catch (e) {
      console.error('change pwd error', e?.response?.data || e.message);
      Alert.alert('Erro', e?.response?.data?.error || 'Não foi possível alterar a senha');
    } finally {
      setChangingPwd(false);
    }
  };

  const MenuItem = ({ icon, title, onPress, showChevron = true, rightComponent }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIconWrap}>
          <Icon name={icon} size={20} color="#334155" />
        </View>
        <Text style={styles.menuItemText}>{title}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {rightComponent}
        {showChevron && <Icon name="chevron-right" size={20} color="#64748B" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      {/* Header Premium */}
      <View style={styles.headerContainer}>
        <View style={styles.headerGradient} />
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.avatarRing}>
              <Icon name="account-circle" size={82} color="#FFFFFF" />
            </View>
            <TouchableOpacity style={styles.headerAction} onPress={openEditProfile}>
              <Icon name="edit" size={18} color="#FFFFFF" />
              <Text style={styles.headerActionText}>Editar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.doctorName}>{user?.name || 'Dr. Usuário'}</Text>
          <Text style={styles.crmNumber}>CRM {user?.crm || '000000'} • {user?.specialty || 'Especialidade'}</Text>

          {/* Badge de status do plano */}
          <View style={styles.planStatusPill}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(subscription?.status) }]} />
            <Text style={styles.planStatusPillText}>{getStatusText(subscription?.status)}</Text>
          </View>
        </View>
      </View>

      {/* Plano Atual */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plano Atual</Text>

        {(loadingSub || loadingPlans) ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#667EEA" />
            <Text style={styles.loadingText}>Carregando plano...</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.planCard} onPress={() => setPlansModalVisible(true)}>
            <View style={styles.planCardGradient} />
            <View style={styles.planHeader}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{currentPlan?.name || '—'}</Text>
                <Text style={styles.planPrice}>
                  {currentPlan ? `${money(currentPlan)} ${durationLabel(currentPlan)}` : '—'}
                </Text>
              </View>
              <View style={styles.planChip}>
                <Icon name="bolt" size={14} color="#FFFFFF" />
                <Text style={styles.planChipText}>{subscription?.status ? getStatusText(subscription.status) : '—'}</Text>
              </View>
            </View>

            <View style={styles.planDetails}>
              <Text style={styles.planUsage}>
                {used} de {limit} análises utilizadas ({usedPct}%)
              </Text>
              {subscription?.endDate && (
                <Text style={styles.planExpiry}>Válido até: {formatDate(subscription.endDate)}</Text>
              )}
            </View>

            <View style={styles.planProgress}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${usedPct}%`, backgroundColor: planColor(currentPlan) }]} />
              </View>
            </View>

            <View style={styles.upgradeHint}>
              <Text style={styles.upgradeText}>Ver outros planos</Text>
              <Icon name="arrow-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Informações pessoais */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Pessoais</Text>
        {loadingMe ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#667EEA" />
            <Text style={styles.loadingText}>Carregando perfil...</Text>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome</Text>
              <Text style={styles.infoValue}>{user?.name || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'Não informado'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefone</Text>
              <Text style={styles.infoValue}>{user?.phone || 'Não informado'}</Text>
            </View>
            <View style={styles.infoRowLast}>
              <Text style={styles.infoLabel}>Cadastrado em</Text>
              <Text style={styles.infoValue}>{user?.createdAt ? formatDate(user.createdAt) : 'Não informado'}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 12 }} />
        <View style={styles.menuContainer}>
          <MenuItem icon="person" title="Editar perfil" onPress={openEditProfile} />
          <MenuItem icon="lock" title="Trocar senha" onPress={openChangePwd} />
          <MenuItem
            icon="notifications"
            title="Notificações"
            onPress={() => setNotifModalVisible(true)}
            rightComponent={
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name={notifyEmail ? 'email' : 'email'} size={18} color={notifyEmail ? '#0EA5E9' : '#94A3B8'} />
                <View style={{ width: 8 }} />
                <Icon name={notifyPush ? 'notifications-active' : 'notifications'} size={18} color={notifyPush ? '#F59E0B' : '#94A3B8'} />
              </View>
            }
          />
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>

      {/* Modal Planos */}
      <Modal animationType="slide" transparent visible={plansModalVisible} onRequestClose={() => setPlansModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setPlansModalVisible(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Escolha seu Plano</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.plansContainer} showsVerticalScrollIndicator={false}>
              {plans.map((plan) => {
                const isCurrent = subscription?.plan === plan.id;
                const color = planColor(plan);
                return (
                  <View
                    key={plan.id}
                    style={[styles.planOption, plan.isPopular && styles.popularPlan, isCurrent && styles.currentPlanOption]}
                  >
                    {plan.isPopular && (
                      <View style={[styles.popularBadge, { backgroundColor: color }]}>
                        <Text style={styles.popularText}>MAIS POPULAR</Text>
                      </View>
                    )}

                    <View style={styles.planOptionHeader}>
                      <Text style={styles.planOptionName}>{plan.name}</Text>
                      <View style={styles.planPricing}>
                        <Text style={styles.planOptionPrice}>{money(plan)}</Text>
                        <Text style={styles.planDuration}> {durationLabel(plan)}</Text>
                      </View>
                    </View>

                    {!!plan.features?.length && (
                      <View style={styles.planFeatures}>
                        {plan.features.map((f, idx) => (
                          <View key={idx} style={styles.featureItem}>
                            <Icon name="check" size={16} color={color} />
                            <Text style={styles.featureText}>{f}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {isCurrent ? (
                      <View style={[styles.currentPlanBadge, { backgroundColor: color }]}>
                        <Text style={styles.currentPlanText}>Plano Atual</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.selectPlanButton, { backgroundColor: color }]}
                        onPress={() => handleUpgradePlan(plan.id)}
                        disabled={upgrading}
                      >
                        <Text style={styles.selectPlanText}>
                          {upgrading ? 'Processando...' : 'Selecionar Plano'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Editar Perfil */}
      <Modal animationType="slide" transparent visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Editar Perfil</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={{ paddingHorizontal: 20 }}>
              {['name', 'email', 'crm', 'specialty', 'phone'].map((field) => (
                <View key={field} style={styles.formRow}>
                  <Text style={styles.formLabel}>
                    {field === 'name' ? 'Nome'
                      : field === 'email' ? 'Email'
                      : field === 'crm' ? 'CRM'
                      : field === 'specialty' ? 'Especialidade'
                      : 'Telefone'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={form[field]}
                    onChangeText={(t) => setForm((s) => ({ ...s, [field]: t }))}
                    autoCapitalize={field === 'email' ? 'none' : 'words'}
                    keyboardType={field === 'phone' ? 'phone-pad' : 'default'}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={[styles.primaryBtn, savingProfile && { opacity: 0.7 }]}
                onPress={saveProfile}
                disabled={savingProfile}
              >
                <Text style={styles.primaryBtnText}>{savingProfile ? 'Salvando...' : 'Salvar'}</Text>
              </TouchableOpacity>
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Trocar Senha */}
      <Modal animationType="slide" transparent visible={pwdModalVisible} onRequestClose={() => setPwdModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setPwdModalVisible(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Trocar Senha</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={{ paddingHorizontal: 20 }}>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Senha atual</Text>
                <TextInput style={styles.input} secureTextEntry value={pwdCurrent} onChangeText={setPwdCurrent} />
              </View>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Nova senha</Text>
                <TextInput style={styles.input} secureTextEntry value={pwdNew} onChangeText={setPwdNew} />
              </View>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Confirmar nova senha</Text>
                <TextInput style={styles.input} secureTextEntry value={pwdConfirm} onChangeText={setPwdConfirm} />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, changingPwd && { opacity: 0.7 }]}
                onPress={doChangePwd}
                disabled={changingPwd}
              >
                <Text style={styles.primaryBtnText}>{changingPwd ? 'Alterando...' : 'Alterar Senha'}</Text>
              </TouchableOpacity>
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Notificações (local) */}
      <Modal animationType="slide" transparent visible={notifModalVisible} onRequestClose={() => setNotifModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Notificações</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Email</Text>
                <Switch value={notifyEmail} onValueChange={setNotifyEmail} />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Push</Text>
                <Switch value={notifyPush} onValueChange={setNotifyPush} />
              </View>
              <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 12 }}>
                (Obs: preferências salvas localmente por enquanto)
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // ===== Header Premium =====
  headerContainer: { height: 220, position: 'relative', overflow: 'hidden' },
  headerGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0F172A',
    background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  },
  headerContent: { flex: 1, paddingTop: (StatusBar.currentHeight || 0) + 24, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarRing: {
    width: 86, height: 86, borderRadius: 43,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)'
  },
  headerAction: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)'
  },
  headerActionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12, letterSpacing: 0.2 },
  doctorName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 16 },
  crmNumber: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 },
  planStatusPill: {
    marginTop: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)'
  },
  planStatusPillText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  // ===== Seções =====
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 12 },

  // ===== Cards Comuns =====
  loadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 2 } })
  },

  // ===== Plano Atual Card =====
  planCard: {
    position: 'relative', overflow: 'hidden', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12 }, android: { elevation: 3 } })
  },
  planCardGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 90,
    backgroundColor: '#EEF2FF',
    background: 'linear-gradient(180deg, rgba(102,126,234,0.18) 0%, rgba(118,75,162,0.10) 100%)'
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  planInfo: { flex: 1 },
  planName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  planPrice: { fontSize: 13, color: '#475569', marginTop: 4 },
  planChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1F2937', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  planChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  planDetails: { marginTop: 6, marginBottom: 8 },
  planUsage: { fontSize: 13, color: '#1F2937' },
  planExpiry: { fontSize: 12, color: '#64748B', marginTop: 2 },
  planProgress: { marginVertical: 6 },
  progressBar: { height: 10, backgroundColor: '#E2E8F0', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  upgradeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 6 },
  upgradeText: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },

  // ===== Info Pessoal =====
  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 2 } })
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoRowLast: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  infoLabel: { fontSize: 13, color: '#64748B' },
  infoValue: { fontSize: 14, color: '#0F172A', fontWeight: '700', flex: 1, textAlign: 'right' },

  // ===== Menu =====
  menuContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuItemRight: { flexDirection: 'row', alignItems: 'center' },
  menuIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  menuItemText: { fontSize: 15, color: '#0F172A', marginLeft: 10, fontWeight: '700' },

  // ===== Logout =====
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginHorizontal: 20, marginTop: 16, marginBottom: 28, borderWidth: 1, borderColor: '#FEE2E2', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  logoutText: { fontSize: 16, color: '#EF4444', fontWeight: '800', marginLeft: 8 },

  // ===== Modal base =====
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', minHeight: '60%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },

  // ===== Modal Planos =====
  plansContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  planOption: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', position: 'relative' },
  popularPlan: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  currentPlanOption: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  popularBadge: { position: 'absolute', top: -10, left: 16, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  popularText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  planOptionHeader: { marginBottom: 10 },
  planOptionName: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  planPricing: { flexDirection: 'row', alignItems: 'baseline' },
  planOptionPrice: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  planDuration: { fontSize: 12, color: '#64748B', marginLeft: 6 },
  planFeatures: { marginTop: 8, marginBottom: 14 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureText: { fontSize: 13, color: '#0F172A', marginLeft: 8 },
  selectPlanButton: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  selectPlanText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  currentPlanBadge: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  currentPlanText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  // ===== Forms modais =====
  formRow: { marginTop: 14 },
  formLabel: { fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: '700' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  primaryBtn: { backgroundColor: '#1F2937', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },

  // ===== Switches =====
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  switchLabel: { fontSize: 15, color: '#0F172A', fontWeight: '700' },
});
