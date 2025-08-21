// mobile/src/screens/ProfileScreen.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  Modal, ActivityIndicator, Switch, TextInput
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

  // Notificações (local; se quiser persistir, integre no /users/me depois)
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
      // Atualiza contexto e form
      setUser?.(data);
      setForm({
        name: data?.name || '',
        email: data?.email || '',
        crm: data?.crm || '',
        specialty: data?.specialty || '',
        phone: data?.phone || ''
      });
      // Se você quiser carregar notificações do backend no futuro, ler de data.preferences/notifications aqui
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

  // Hoje: usa upgrade direto. Futuro (Stripe): chame um endpoint /plans/checkout e redirecione para checkoutUrl
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
      await axios.post('/users/change-password', {
        currentPassword: pwdCurrent,
        newPassword: pwdNew
      });
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
        <Icon name={icon} size={24} color="#6B7280" />
        <Text style={styles.menuItemText}>{title}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {rightComponent}
        {showChevron && <Icon name="chevron-right" size={20} color="#6B7280" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Icon name="account-circle" size={80} color="#1E3A8A" />
        </View>
        <Text style={styles.doctorName}>{user?.name || 'Dr. Usuário'}</Text>
        <Text style={styles.crmNumber}>CRM {user?.crm || '000000'}</Text>
        <Text style={styles.specialty}>{user?.specialty || 'Especialidade'}</Text>
      </View>

      {/* Plano Atual */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plano Atual</Text>

        {(loadingSub || loadingPlans) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#1E3A8A" />
            <Text style={styles.loadingText}>Carregando plano...</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.planCard} onPress={() => setPlansModalVisible(true)}>
            <View style={styles.planHeader}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{currentPlan?.name || '—'}</Text>
                <Text style={styles.planPrice}>
                  {currentPlan ? `${money(currentPlan)} ${durationLabel(currentPlan)}` : '—'}
                </Text>
              </View>
              <View style={styles.planStatus}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(subscription?.status) }]} />
                <Text style={styles.statusText}>{getStatusText(subscription?.status)}</Text>
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
              <Text style={styles.upgradeText}>Toque para ver outros planos</Text>
              <Icon name="arrow-forward" size={16} color="#6B7280" />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Informações pessoais */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Pessoais</Text>
        {loadingMe ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#1E3A8A" />
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
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cadastrado em</Text>
              <Text style={styles.infoValue}>
                {user?.createdAt ? formatDate(user.createdAt) : 'Não informado'}
              </Text>
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
                <Icon name={notifyEmail ? 'email' : 'email-off'} size={18} color="#6B7280" />
                <View style={{ width: 8 }} />
                <Icon name={notifyPush ? 'notifications-active' : 'notifications-off'} size={18} color="#6B7280" />
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
                    style={[
                      styles.planOption,
                      plan.isPopular && styles.popularPlan,
                      isCurrent && styles.currentPlanOption
                    ]}
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
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={pwdCurrent}
                  onChangeText={setPwdCurrent}
                />
              </View>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Nova senha</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={pwdNew}
                  onChangeText={setPwdNew}
                />
              </View>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Confirmar nova senha</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={pwdConfirm}
                  onChangeText={setPwdConfirm}
                />
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  profileHeader: { backgroundColor: 'white', alignItems: 'center', padding: 32, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  avatarContainer: { marginBottom: 16 },
  doctorName: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginTop: 16 },
  crmNumber: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  specialty: { fontSize: 14, color: '#6B7280', marginTop: 2 },

  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 16 },

  loadingContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, padding: 20 },
  loadingText: { marginLeft: 10, color: '#6B7280', fontSize: 16 },

  planCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, borderWidth: 2, borderColor: '#E5E7EB' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  planInfo: { flex: 1 },
  planName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  planPrice: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  planStatus: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  planDetails: { marginBottom: 16 },
  planUsage: { fontSize: 14, color: '#374151', marginBottom: 4 },
  planExpiry: { fontSize: 14, color: '#6B7280' },
  planProgress: { marginBottom: 16 },
  progressBar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  upgradeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  upgradeText: { fontSize: 14, color: '#6B7280', marginRight: 4 },

  infoCard: { backgroundColor: 'white', borderRadius: 12, padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, color: '#1F2937', fontWeight: '500', flex: 1, textAlign: 'right' },

  menuContainer: { backgroundColor: 'white', borderRadius: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuItemRight: { flexDirection: 'row', alignItems: 'center' },
  menuItemText: { fontSize: 16, color: '#1F2937', marginLeft: 12 },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 12, padding: 16, margin: 20, borderWidth: 1, borderColor: '#FEE2E2' },
  logoutText: { fontSize: 16, color: '#EF4444', fontWeight: '600', marginLeft: 8 },

  // Modal base
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', minHeight: '60%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },

  plansContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  planOption: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: '#E5E7EB', position: 'relative' },
  popularPlan: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  currentPlanOption: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  popularBadge: { position: 'absolute', top: -10, left: 20, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  popularText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  planOptionHeader: { marginBottom: 16 },
  planOptionName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  planPricing: { flexDirection: 'row', alignItems: 'baseline' },
  planOptionPrice: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  planDuration: { fontSize: 14, color: '#6B7280', marginLeft: 8 },
  planFeatures: { marginBottom: 20 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureText: { fontSize: 14, color: '#374151', marginLeft: 8 },
  selectPlanButton: { borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  selectPlanText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  currentPlanBadge: { borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  currentPlanText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  // Forms modais
  formRow: { marginTop: 16 },
  formLabel: { fontSize: 14, color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16
  },
  primaryBtn: {
    backgroundColor: '#1E3A8A', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  // Switches
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  switchLabel: { fontSize: 16, color: '#1F2937' },
});
