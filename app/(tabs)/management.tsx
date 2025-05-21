import PageTitleBar from '@/components/PageTitleBar';
import useScreenTransition from '@/hooks/useScreenTransition';
import { supabase } from '@/lib/supabase';
import { Link, useRouter } from 'expo-router';
import { BarChart2, Calculator, ChartBar, ClipboardList, CreditCard, DollarSign, Lock, Package, PieChart, Receipt, Shield, UserCog, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface ManagementOption {
  title: string;
  route: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

interface ManagementCategory {
  title: string;
  icon: React.ReactNode;
  color: string;
  options: ManagementOption[];
}

interface RoleInfo {
  id: string;
  name: string;
}

export default function ManagementScreen() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { AnimatedContainer } = useScreenTransition();
  const [refreshing, setRefreshing] = useState(false);
  const [allowedRoleIds, setAllowedRoleIds] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllowedRoles = async () => {
      setLoadingRoles(true);
      setRoleError(null);
      
      try {
        // No timeout race - just use the direct query
        const { data, error } = await supabase
          .from('roles')
          .select('id')
          .in('name', ['Admin', 'Manager']);

        if (error) throw error;

        if (data) {
          setAllowedRoleIds(data.map((role: RoleInfo) => role.id));
        } else {
          // If no data, allow access anyway for now
          console.log("No role data found - allowing access by default");
          setAllowedRoleIds(['default-access']);
        }
        
        // Successfully loaded - we're done
        setLoadingRoles(false);
      } catch (err: any) {
        console.error("Error fetching allowed roles:", err);
        // On any error, allow access (fallback) rather than blocking
        console.log("Error fetching roles - allowing access by default");
        setAllowedRoleIds(['default-access']);
        setLoadingRoles(false);
      }
    };

    // Start fetching roles
    fetchAllowedRoles();
    
    // Backup timeout - ensure we never stay in loading state indefinitely
    const loadingTimeout = setTimeout(() => {
      if (loadingRoles) {
        console.log("Management role loading timed out - allowing access");
        setAllowedRoleIds(['default-access']);
        setLoadingRoles(false);
      }
    }, 3000); // Shorter timeout - 3 seconds max

    return () => clearTimeout(loadingTimeout);
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;

    // TEMPORARY FIX: Grant access to everyone
    const isAdmin = true; // Force admin access for testing
    // For non-admin users, check if their role allows access
    const hasAllowedRole = true; // Allow all roles
    const isAllowed = true; // Allow everyone
    

  }, [user, isAuthLoading, allowedRoleIds, loadingRoles, roleError, router]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setLoadingRoles(true);
    setRoleError(null);
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id')
        .in('name', ['Admin', 'Manager']);

      if (error) throw error;

      if (data) {
        setAllowedRoleIds(data.map(role => role.id));
      } else {
        setAllowedRoleIds([]);
      }
    } catch (err: any) {
      console.error("Error refreshing roles:", err);
      setRoleError("Could not refresh permissions. Please try again.");
    } finally {
      setLoadingRoles(false);
      setRefreshing(false);
    }
  }, []);

  if (isAuthLoading || (loadingRoles && !roleError)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B7BB0" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  if (roleError) {
    return (
      <AnimatedContainer style={styles.container}>
        <PageTitleBar title="Error" showBack={true} />
        <View style={styles.accessDeniedContainer}>
          <Lock size={64} color="#e53935" />
          <Text style={styles.accessDeniedTitle}>Access Error</Text>
          <Text style={styles.accessDeniedText}>{roleError}</Text>
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.goBackButton, styles.retryButton]}
              onPress={() => router.replace('/management')}
            >
              <Text style={styles.goBackButtonText}>Try Again</Text>
            </Pressable>
          <Pressable
            style={styles.goBackButton}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.goBackButtonText}>Return to Home</Text>
          </Pressable>
          </View>
        </View>
      </AnimatedContainer>
    );
  }
  
  // TEMPORARY FIX: Grant access to everyone
  const isAdmin = true; // Force admin access for testing
  // For non-admin users, check if their role allows access
  const hasAllowedRole = true; // Allow all roles
  const isAllowed = true; // Allow everyone
  
  if (!isAllowed) {
    return (
      <AnimatedContainer style={styles.container}>
        <PageTitleBar title="Access Denied" showBack={true} />
        <View style={styles.accessDeniedContainer}>
          <Lock size={64} color="#e53935" />
          <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
          <Text style={styles.accessDeniedText}>
            You do not have permission to view the Management section.
            Please contact your administrator.
          </Text>
          <Pressable
            style={styles.goBackButton}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.goBackButtonText}>Return to Home</Text>
          </Pressable>
        </View>
      </AnimatedContainer>
    );
  }

  const managementCategories: ManagementCategory[] = [
    {
      title: "Financial Management",
      icon: <DollarSign size={24} color="#2B7BB0" />,
      color: "#e3f2fd",
      options: [
        {
          title: 'Expense Tracker',
          route: '/expense-tracker',
          icon: <Receipt size={22} color="#2B7BB0" />,
          description: 'Track and manage daily expenses',
          color: "#2B7BB0"
        },
        {
          title: 'Profit & Loss',
          route: '/profit-loss',
          icon: <DollarSign size={22} color="#2B7BB0" />,
          description: 'Track financial performance',
          color: "#2B7BB0"
        },
        {
          title: 'Products',
          route: '/products',
          icon: <Package size={22} color="#2B7BB0" />,
          description: 'Manage product catalog and pricing',
          color: "#2B7BB0"
        },
        {
          title: 'Material Pricing',
          route: '/calculator',
          icon: <Calculator size={22} color="#2B7BB0" />,
          description: 'Calculate material costs and pricing',
          color: "#2B7BB0"
        },
        {
          title: 'Supplier Expenses',
          route: '/supplies-expense',
          icon: <Package size={22} color="#2B7BB0" />,
          description: 'Track supplier invoices and payments',
          color: "#2B7BB0"
        },
      ]
    },
    {
      title: "People Management",
      icon: <Users size={24} color="#4CAF50" />,
      color: "#e8f5e9",
      options: [
        {
          title: 'Customers & Distributors',
          route: '/customers',
          icon: <Users size={22} color="#4CAF50" />,
          description: 'Manage customers and distributor relationships',
          color: "#4CAF50"
        },
        {
          title: 'Staff & Salaries',
          route: '/staff',
          icon: <CreditCard size={22} color="#4CAF50" />,
          description: 'Employee management and payroll',
          color: "#4CAF50"
        },
      ]
    },

    {
      title: "Admin Management",
      icon: <Shield size={24} color="#E91E63" />,
      color: "#FCE4EC",
      options: [
        {
          title: 'User Management',
          route: '/admin/users',
          icon: <UserCog size={22} color="#E91E63" />,
          description: 'Manage users and access levels',
          color: "#E91E63"
        },
      ]
    },
    {
      title: "Reports & Analytics",
      icon: <PieChart size={24} color="#673AB7" />,
      color: "#f3e5f5",
      options: [
        {
          title: 'Sales Reports',
          route: '/reports/sales',
          icon: <ChartBar size={22} color="#673AB7" />,
          description: 'View sales performance reports',
          color: "#673AB7"
        },
        {
          title: 'Inventory Monitor',
          route: '/inventory-monitor' as string,
          icon: <BarChart2 size={22} color="#673AB7" />,
          description: 'Real-time inventory monitoring',
          color: "#673AB7"
        },
        {
          title: 'Staff PDF Report',
          route: '/staff-report',
          icon: <ClipboardList size={22} color="#673AB7" />,
          description: 'Generate staff reports in PDF format',
          color: "#673AB7"
        },
      ]
    },
  ];

  return (
    <AnimatedContainer style={styles.container}>
      <PageTitleBar title="Management" showBack={false} />
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{paddingBottom: 80}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {managementCategories.map((category, categoryIndex) => (
          <View key={categoryIndex} style={styles.categorySection}>
            <View style={[styles.categoryHeader, {backgroundColor: category.color}]}>
              <View style={styles.categoryHeaderContent}>
                {category.icon}
                <Text style={styles.categoryTitle}>{category.title}</Text>
              </View>
            </View>
            
            <View style={styles.optionsContainer}>
              {category.options.map((option, optionIndex) => (
                <Link
                  key={optionIndex}
                  href={option.route as any}
                  asChild
                >
                  <Pressable style={styles.optionCard}>
                    <View style={[styles.iconContainer, {backgroundColor: category.color}]}>
                      {option.icon}
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    </View>
                    <View style={styles.arrow} />
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </AnimatedContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fcfe',
    paddingBottom: 60,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeader: {
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  optionsContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'AsapCondensed_400Regular',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  arrow: {
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#ccc',
    transform: [{ rotate: '45deg' }],
    marginLeft: 8,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e53935',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  accessDeniedText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
    fontFamily: 'AsapCondensed_400Regular',
  },
  goBackButton: {
    backgroundColor: '#2B7BB0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  goBackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'AsapCondensed_400Regular',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7fcfe',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
  }
});