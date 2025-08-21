import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

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

  const MenuItem = ({ icon, title, onPress, showChevron = true }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Icon name={icon} size={24} color="#6B7280" />
        <Text style={styles.menuItemText}>{title}</Text>
      </View>
      {showChevron && <Icon name="chevron-right" size={20} color="#6B7280" />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Icon name="account-circle" size={80} color="#1E3A8A" />
        </View>
        <Text style={styles.doctorName}>{user?.name}</Text>
        <Text style={styles.crmNumber}>CRM {user?.crm}</Text>
        <Text style={styles.specialty}>{user?.specialty}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Pessoais</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telefone</Text>
            <Text style={styles.infoValue}>{user?.phone || 'Não informado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Endereço</Text>
            <Text style={styles.infoValue}>Rua Exemplo, 123 - Vitória, ES</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações da conta</Text>
        <View style={styles.menuContainer}>
          <MenuItem icon="lock" title="Trocar senha" />
          <MenuItem icon="notifications" title="Notificações" />
          <MenuItem icon="security" title="Configurações de conta" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações do app</Text>
        <View style={styles.menuContainer}>
          <MenuItem icon="language" title="Idioma" />
          <MenuItem icon="help" title="Ajuda" />
          <MenuItem icon="info" title="Sobre" />
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  profileHeader: { backgroundColor: 'white', alignItems: 'center', padding: 32, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  avatarContainer: { marginBottom: 16 },
  doctorName: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginTop: 16 },
  crmNumber: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  specialty: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  infoCard: { backgroundColor: 'white', borderRadius: 12, padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, color: '#1F2937', fontWeight: '500' },
  menuContainer: { backgroundColor: 'white', borderRadius: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemText: { fontSize: 16, color: '#1F2937', marginLeft: 12 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 12, padding: 16, margin: 20, borderWidth: 1, borderColor: '#FEE2E2' },
  logoutText: { fontSize: 16, color: '#EF4444', fontWeight: '600', marginLeft: 8 }
});

export default ProfileScreen;
