import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Users, Shield, Settings, ChevronRight, Key, Bell, Globe, Database, Palette, CircleHelp as HelpCircle } from 'lucide-react-native';
import PageTitleBar from '@/components/PageTitleBar';

interface AdminSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  subsections: AdminSubsection[];
}

interface AdminSubsection {
  id: string;
  title: string;
  icon: React.ReactNode;
}

export default function AdminDashboardScreen() {
  const adminSections: AdminSection[] = [
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Manage users, permissions, and PINs',
      icon: <Users size={24} color="#fff" />,
      color: '#4CAF50',
      subsections: [
        { id: 'users', title: 'Users', icon: <Users size={20} color="#666" /> },
        { id: 'roles', title: 'Roles', icon: <Shield size={20} color="#666" /> },
        { id: 'pins', title: 'PINs', icon: <Key size={20} color="#666" /> },
      ],
    },
    {
      id: 'access-control',
      title: 'Access Control',
      description: 'Configure roles and permissions',
      icon: <Shield size={24} color="#fff" />,
      color: '#2196F3',
      subsections: [
        { id: 'permissions', title: 'Permissions', icon: <Key size={20} color="#666" /> },
        { id: 'audit-log', title: 'Audit Log', icon: <Database size={20} color="#666" /> },
      ],
    },
    {
      id: 'system-settings',
      title: 'System Settings',
      description: 'Configure system preferences',
      icon: <Settings size={24} color="#fff" />,
      color: '#9C27B0',
      subsections: [
        { id: 'notifications', title: 'Notifications', icon: <Bell size={20} color="#666" /> },
        { id: 'localization', title: 'Localization', icon: <Globe size={20} color="#666" /> },
        { id: 'appearance', title: 'Appearance', icon: <Palette size={20} color="#666" /> },
        { id: 'help', title: 'Help & Support', icon: <HelpCircle size={20} color="#666" /> },
      ],
    },
  ];

  return (
    <View style={styles.container}>
            <PageTitleBar title="Admin Dashboard" showBack={true} />
      <ScrollView style={styles.content}>

        {adminSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <View style={[styles.sectionHeader, { backgroundColor: section.color }]}>
              {section.icon}
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionDescription}>{section.description}</Text>
              </View>
            </View>

            <View style={styles.subsections}>
              {section.subsections.map((subsection) => (
                <Pressable
                  key={subsection.id}
                  style={styles.subsectionButton}
                >
                  <View style={styles.subsectionContent}>
                    {subsection.icon}
                    <Text style={styles.subsectionTitle}>{subsection.title}</Text>
                  </View>
                  <ChevronRight size={20} color="#666" />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>System Status</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Active Users</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>5</Text>
              <Text style={styles.statLabel}>User Roles</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>99.9%</Text>
              <Text style={styles.statLabel}>Uptime</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>v2.1.0</Text>
              <Text style={styles.statLabel}>Version</Text>
            </View>
          </View>
        </View>

        <View style={styles.activitySection}>
          <Text style={styles.activityTitle}>Recent Activity</Text>
          
          <View style={styles.activityList}>
            {[
              { time: '2 mins ago', action: 'User role updated', user: 'Admin' },
              { time: '15 mins ago', action: 'New user added', user: 'Manager' },
              { time: '1 hour ago', action: 'Settings changed', user: 'Admin' },
              { time: '2 hours ago', action: 'Permission modified', user: 'Supervisor' },
            ].map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <Text style={styles.activityTime}>{activity.time}</Text>
                <Text style={styles.activityAction}>{activity.action}</Text>
                <Text style={styles.activityUser}>by {activity.user}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: 80,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  headerText: {
    fontSize: 24,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#2B7BB0',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#fff',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#fff',
    opacity: 0.9,
  },
  subsections: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subsectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  subsectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
  },
  statsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 20,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#2B7BB0',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
  },
  activitySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityTitle: {
    fontSize: 20,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    marginBottom: 16,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  activityTime: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
  },
  activityAction: {
    flex: 2,
    fontSize: 12,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
  },
  activityUser: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
    textAlign: 'right',
  },
});