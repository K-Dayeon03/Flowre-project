import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../constants/theme';
import { useAuthStore, UserRole } from '../../store/useAuthStore';
import Avatar from '../../components/Avatar';

const ROLE_LABEL: Record<UserRole, string> = {
  STORE_STAFF: '매장 직원',
  STORE_MANAGER: '점장',
  HQ_STAFF: '본사 직원',
  ADMIN: '관리자',
};

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* 아바타 */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatarSpacer}>
            <Avatar name={user.name} size={88} />
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.role}>{ROLE_LABEL[user.role]}</Text>
        </View>

        {/* 정보 카드 */}
        <View style={styles.card}>
          <InfoRow label="직원 코드" value={user.employeeCode ?? user.email ?? '-'} />
          <Divider />
          <InfoRow label="소속 매장" value={user.storeName} />
          <Divider />
          <InfoRow label="직급" value={ROLE_LABEL[user.role]} />
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            await logout();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, alignItems: 'center' },
  avatarWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  avatarSpacer: { marginBottom: Spacing.md },
  name: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.textPrimary },
  role: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.xs },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    ...Shadow.card,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  infoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.border },
  logoutBtn: {
    width: '100%',
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '700' },
});
