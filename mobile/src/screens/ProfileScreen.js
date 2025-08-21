import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [plansModalVisible, setPlansModalVisible] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const plans = [
    {
      id: 'trial',
      name: 'Teste Grátis',
      price: 'Grátis',
      duration: '7 dias',
      analysisLimit: 3,
      features: ['3 análises', '7 dias de teste', 'Suporte básico'],
      color: '#9CA3AF',
      isPopular: false
    },
    {
      id: 'monthly',
      name: 'Mensal',
      price: 'R$ 39,90',
      duration: 'por mês',
      analysisLimit: 50,
      features: ['50 análises/mês', 'Suporte prioritário', 'Histórico completo', 'Exportar relatórios'],
      color: '#3B82F6',
      isPopular: false
    },
    {
      id: 'quarterly',
      name: 'Trimestral',
      price: 'R$ 99,90',
      duration: 'por trimestre',
      analysisLimit: 200,
      features: ['200 análises/trimestre', 'Suporte prioritário', 'Histórico completo', 'Exportar relatórios', '17% de desconto'],
      color: '#10B981',
      isPopular: true
    },
    {
      id: 'annual',
      name: 'Anual',
      price: 'R$ 359,90',
      duration: 'por ano',
      analysisLimit: 1000,
      features: ['1000 análises/ano', 'Suporte VIP', 'Histórico ilimitado', 'Exportar relatórios', 'API dedicada', '25% de desconto'],
      color: '#8B5CF6',
      isPopular: false
    }
  ];

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/subscriptions');
      setSubscription(response.data);
    } catch (error) {
      console.error('Error loading subscription:', error);
      // Se não conseguir carregar, assume plano trial
      setSubscription({
        plan: 'trial',
        status: 'active',
        analysisLimit: 3,
        analysisUsed: 0,
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPlan = () => {
    if (!subscription) return plans[0];
    return plans.find(plan => plan.id === subscription.plan) || plans[0];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
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

  const handleUpgradePlan = async (planId) => {
    if (planId === subscription?.plan) {
      Alert.alert('Aviso', 'Você já possui este plano');
      return;
    }

    Alert.alert(
      'Confirmar Upgrade',
      `Deseja alterar para o plano ${plans.find(p => p.id === planId)?.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => upgradePlan(planId)
        }
      ]
    );
  };

  const upgradePlan = async (planId) => {
    setUpgrading(true);
    try {
      const response = await axios.post('/subscriptions/upgrade', { plan: planId });
      
      setSubscription(response.data.subscription);
      setPlansModalVisible(false);
      
      Alert.alert('Sucesso', 'Plano atualizado com sucesso!');
    } catch (error) {
      console.error('Error upgrading plan:', error);
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao atualizar plano');
    } finally {
      setUpgrading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', onPress: logout }
      ]
    );
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

  const currentPlan = getCurrentPlan();

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Icon name="account-circle" size={80} color="#1E3A8A" />
        </View>
        <Text style={styles.doctorName}>{user?.name || 'Dr. Usuário'}</Text>
        <Text style={styles.crmNumber}>CRM {user?.crm || '000000'}</Text>
        <Text style={styles.specialty}>{user?.specialty || 'Especialidade'}</Text>
      </View>

      {/* Current Plan Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plano Atual</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#1E3A8A" />
            <Text style={styles.loadingText}>Carregando plano...</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.planCard}
            onPress={() => setPlansModalVisible(true)}
          >
            <View style={styles.planHeader}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{currentPlan.name}</Text>
                <Text style={styles.planPrice}>{currentPlan.price}</Text>
              </View>
              <View style={styles.planStatus}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(subscription?.status) }]} />
                <Text style={styles.statusText}>{getStatusText(subscription?.status)}</Text>
              </View>
            </View>
            
            <View style={styles.planDetails}>
              <Text style={styles.planUsage}>
                {subscription?.analysisUsed || 0} de {subscription?.analysisLimit || 0} análises utilizadas
              </Text>
              {subscription?.endDate && (
                <Text style={styles.planExpiry}>
                  Válido até: {formatDate(subscription.endDate)}
                </Text>
              )}
            </View>

            <View style={styles.planProgress}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${Math.min(100, (subscription?.analysisUsed || 0) / (subscription?.analysisLimit || 1) * 100)}%`,
                      backgroundColor: currentPlan.color 
                    }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.upgradeHint}>
              <Text style={styles.upgradeText}>Toque para ver outros planos</Text>
              <Icon name="arrow-forward" size={16} color="#6B7280" />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Pessoais</Text>
        <View style={styles.infoCard}>
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
      </View>

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações da conta</Text>
        <View style={styles.menuContainer}>
          <MenuItem 
            icon="person" 
            title="Editar perfil" 
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
          />
          <MenuItem 
            icon="lock" 
            title="Trocar senha" 
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
          />
          <MenuItem 
            icon="notifications" 
            title="Notificações" 
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
          />
        </View>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações do app</Text>
        <View style={styles.menuContainer}>
          <MenuItem 
            icon="language" 
            title="Idioma" 
            rightComponent={<Text style={styles.currentLanguage}>Português</Text>}
            onPress={() => Alert.alert('Idioma', 'Apenas português disponível no momento')}
          />
          <MenuItem 
            icon="help" 
            title="Ajuda" 
            onPress={() => Alert.alert('Ajuda', 'Entre em contato pelo email: suporte@medicalai.com')}
          />
          <MenuItem 
            icon="info" 
            title="Sobre" 
            onPress={() => Alert.alert('Medical AI', 'Versão 1.0.0\n\nDesenvolvido para auxiliar profissionais de saúde')}
          />
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>

      {/* Plans Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={plansModalVisible}
        onRequestClose={() => setPlansModalVisible(false)}
      >
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
              {plans.map((plan, index) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planOption,
                    plan.isPopular && styles.popularPlan,
                    subscription?.plan === plan.id && styles.currentPlanOption
                  ]}
                  onPress={() => handleUpgradePlan(plan.id)}
                  disabled={upgrading}
                >
                  {plan.isPopular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>MAIS POPULAR</Text>
                    </View>
                  )}
                  
                  <View style={styles.planOptionHeader}>
                    <Text style={styles.planOptionName}>{plan.name}</Text>
                    <View style={styles.planPricing}>
                      <Text style={styles.planOptionPrice}>{plan.price}</Text>
                      <Text style={styles.planDuration}>{plan.duration}</Text>
                    </View>
                  </View>

                  <View style={styles.planFeatures}>
                    {plan.features.map((feature, idx) => (
                      <View key={idx} style={styles.featureItem}>
                        <Icon name="check" size={16} color={plan.color} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  {subscription?.plan === plan.id ? (
                    <View style={styles.currentPlanBadge}>
                      <Text style={styles.currentPlanText}>Plano Atual</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.selectPlanButton, { backgroundColor: plan.color }]}
                      onPress={() => handleUpgradePlan(plan.id)}
                      disabled={upgrading}
                    >
                      <Text style={styles.selectPlanText}>
                        {upgrading ? 'Processando...' : 'Selecionar Plano'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  profileHeader: { 
    backgroundColor: 'white', 
    alignItems: 'center', 
    padding: 32,
    paddingTop: 60,
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB' 
  },
  avatarContainer: { 
    marginBottom: 16 
  },
  doctorName: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1F2937', 
    marginTop: 16 
  },
  crmNumber: { 
    fontSize: 16, 
    color: '#6B7280', 
    marginTop: 4 
  },
  specialty: { 
    fontSize: 14, 
    color: '#6B7280', 
    marginTop: 2 
  },
  section: { 
    padding: 20 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#1F2937', 
    marginBottom: 16 
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    color: '#6B7280',
    fontSize: 16,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  planPrice: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  planStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  planDetails: {
    marginBottom: 16,
  },
  planUsage: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  planExpiry: {
    fontSize: 14,
    color: '#6B7280',
  },
  planProgress: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  upgradeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeText: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  infoCard: { 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 16 
  },
  infoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  infoLabel: { 
    fontSize: 14, 
    color: '#6B7280' 
  },
  infoValue: { 
    fontSize: 14, 
    color: '#1F2937', 
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  menuContainer: { 
    backgroundColor: 'white', 
    borderRadius: 12 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  menuItemLeft: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: { 
    fontSize: 16, 
    color: '#1F2937', 
    marginLeft: 12 
  },
  currentLanguage: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 16, 
    margin: 20, 
    borderWidth: 1, 
    borderColor: '#FEE2E2' 
  },
  logoutText: { 
    fontSize: 16, 
    color: '#EF4444', 
    fontWeight: '600', 
    marginLeft: 8 
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  plansContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  planOption: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  popularPlan: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  currentPlanOption: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planOptionHeader: {
    marginBottom: 16,
  },
  planOptionName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planOptionPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  planDuration: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  planFeatures: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  selectPlanButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectPlanText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  currentPlanBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  currentPlanText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;