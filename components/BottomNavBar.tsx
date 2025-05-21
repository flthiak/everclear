import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Calendar, ClipboardList, Home, Package, ShoppingBag, Truck, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type TabName = 'home' | 'sales' | 'deliveries' | 'payments' | 'stock' | 'supplies' | 'management';

interface BottomNavBarProps {
  activeTab: TabName | string;
  onTabPress?: (tab: TabName) => void;
}

export default function BottomNavBar({ activeTab, onTabPress }: BottomNavBarProps) {
  const router = useRouter();

  const handlePress = (tab: TabName) => {
    if (onTabPress) {
      onTabPress(tab);
      return;
    }
    
    // Default navigation based on the requested tab structure
    switch (tab) {
      case 'home':
        router.push('/(tabs)');
        break;
      case 'sales':
        router.push('/(tabs)/sales');
        break;
      case 'deliveries':
        router.push('/(tabs)/deliveries');
        break;
      case 'payments':
        router.push('/(tabs)/payments');
        break;
      case 'stock':
        router.push('/(tabs)/stock');
        break;
      case 'supplies':
        router.push('/(tabs)/supplies');
        break;
      case 'management':
        router.push('/(tabs)/management');
        break;
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <LinearGradient
        colors={['#4568dc', '#b06ab3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bottomNavBar}
      >
        <Pressable 
          style={[styles.navButton, activeTab === 'home' && styles.activeNavButton]}
          onPress={() => handlePress('home')}
        >
          <Home size={20} color={activeTab === 'home' ? "#4568dc" : "#fff"} />
          {activeTab === 'home' && (
            <Text style={[styles.navButtonText, activeTab === 'home' && styles.activeNavButtonText]}>
              Home
            </Text>
          )}
        </Pressable>

        <Pressable 
          style={[styles.navButton, activeTab === 'sales' && styles.activeNavButton]}
          onPress={() => handlePress('sales')}
        >
          <ClipboardList size={20} color={activeTab === 'sales' ? "#4568dc" : "#fff"} />
          {activeTab === 'sales' && (
            <Text style={[styles.navButtonText, activeTab === 'sales' && styles.activeNavButtonText]}>
              Sales
            </Text>
          )}
        </Pressable>
        
        <Pressable 
          style={[styles.navButton, activeTab === 'deliveries' && styles.activeNavButton]}
          onPress={() => handlePress('deliveries')}
        >
          <Truck size={20} color={activeTab === 'deliveries' ? "#4568dc" : "#fff"} />
          {activeTab === 'deliveries' && (
            <Text style={[styles.navButtonText, activeTab === 'deliveries' && styles.activeNavButtonText]}>
              Deliveries
            </Text>
          )}
        </Pressable>
        
        <Pressable 
          style={[styles.navButton, activeTab === 'payments' && styles.activeNavButton]}
          onPress={() => handlePress('payments')}
        >
          <Calendar size={20} color={activeTab === 'payments' ? "#4568dc" : "#fff"} />
          {activeTab === 'payments' && (
            <Text style={[styles.navButtonText, activeTab === 'payments' && styles.activeNavButtonText]}>
              Payments
            </Text>
          )}
        </Pressable>
        
        <Pressable 
          style={[styles.navButton, activeTab === 'stock' && styles.activeNavButton]}
          onPress={() => handlePress('stock')}
        >
          <Package size={20} color={activeTab === 'stock' ? "#4568dc" : "#fff"} />
          {activeTab === 'stock' && (
            <Text style={[styles.navButtonText, activeTab === 'stock' && styles.activeNavButtonText]}>
              Stock
            </Text>
          )}
        </Pressable>
        
        <Pressable 
          style={[styles.navButton, activeTab === 'supplies' && styles.activeNavButton]}
          onPress={() => handlePress('supplies')}
        >
          <ShoppingBag size={20} color={activeTab === 'supplies' ? "#4568dc" : "#fff"} />
          {activeTab === 'supplies' && (
            <Text style={[styles.navButtonText, activeTab === 'supplies' && styles.activeNavButtonText]}>
              Supplies
            </Text>
          )}
        </Pressable>
        
        <Pressable 
          style={[styles.navButton, activeTab === 'management' && styles.activeNavButton]}
          onPress={() => handlePress('management')}
        >
          <Users size={20} color={activeTab === 'management' ? "#4568dc" : "#fff"} />
          {activeTab === 'management' && (
            <Text style={[styles.navButtonText, activeTab === 'management' && styles.activeNavButtonText]}>
              Mgmt
            </Text>
          )}
        </Pressable>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    margin: 10,
    zIndex: 100,
    opacity: 0.8,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  activeNavButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  activeNavButtonText: {
    color: '#4568dc',
    fontWeight: '600',
    marginTop: 0,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#757575',
    marginTop: 2,
  },
  tabTextActive: {
    color: '#2B7BB0',
    fontWeight: '500',
  },
}); 