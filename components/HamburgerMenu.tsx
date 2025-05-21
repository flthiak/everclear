import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { X, User, LogOut } from 'lucide-react-native';
import { useState, useCallback } from 'react';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';

interface MenuProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function HamburgerMenu({ isOpen: externalIsOpen, onClose }: MenuProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  
  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
  }, [onClose]);

  const handleLogout = async () => {
    try {
    await logout();
    handleClose();
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.overlay, 
          { opacity: isOpen ? 1 : 0, display: isOpen ? 'flex' : 'none' }
        ]} 
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <Pressable 
          style={styles.overlayPressable}
          onPress={handleClose}
        >
          <View 
            style={[
              styles.menuWrapper,
              { transform: [{ translateY: isOpen ? 0 : -300 }] }
            ]}
          >
            <View style={styles.menu}>
              <View style={styles.header}>
                <Text style={styles.menuTitle}>Menu</Text>
                <Pressable onPress={handleClose} style={styles.closeButton}>
                  <X size={24} color="#333" />
                </Pressable>
              </View>

              <View style={styles.contentContainer}>
                {/* User section */}
                <View style={styles.userSection}>
                  {user && (
                    <Text style={styles.userInfo}>
                      Logged in as: {user.phone_number}
                    </Text>
                  )}
                  
                  <Link 
                    href="/profile"
                    asChild
                    onPress={handleClose}
                  >
                    <Pressable style={styles.menuItem}>
                      <View style={styles.menuItemContent}>
                        <View style={styles.iconContainer}>
                          <User size={16} color="#2B7BB0" />
                        </View>
                        <Text style={styles.menuItemText}>Profile</Text>
                      </View>
                    </Pressable>
                  </Link>
                  
                  <Pressable 
                    style={styles.menuItem}
                    onPress={handleLogout}
                  >
                    <View style={styles.menuItemContent}>
                      <View style={styles.iconContainer}>
                        <LogOut size={16} color="#F44336" />
                      </View>
                      <Text style={[styles.menuItemText, { color: '#F44336' }]}>Logout</Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  overlayPressable: {
    flex: 1,
    alignItems: 'center',
  },
  menuWrapper: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 60 : 50,
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menu: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    ...Platform.select({
      native: {
        height: 'auto',
        minHeight: 150,
      },
      default: {
        maxHeight: 200,
      }
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#ff8672',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 2,
  },
  contentContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#eee',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#333',
  },
  userSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 0,
    paddingTop: 0,
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});