import { Gruppo_400Regular, useFonts } from '@expo-google-fonts/gruppo';
import { usePathname, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface PageTitleBarProps {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  subtitle?: string;
  children?: React.ReactNode;
  backgroundColor?: string;
  textColor?: string;
  onBackPress?: () => void;
  showVersion?: boolean;
}

export default function PageTitleBar({ 
  title, 
  showBack = true, 
  rightElement, 
  subtitle, 
  children, 
  backgroundColor, 
  textColor,
  onBackPress,
  showVersion = false
}: PageTitleBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Load Gruppo font explicitly in this component
  const [fontsLoaded] = useFonts({
    'Gruppo': Gruppo_400Regular,
  });

  const navigateBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    
    try {
      router.back();
    } catch (error) {
      console.log('Navigation error:', error);
      // Fallback: go to parent route or home
      const parentPath = pathname.split('/').slice(0, -1).join('/') || '/';
      router.push(parentPath as any);
    }
  };

  // Get the appropriate font family name based on platform
  const getFontFamily = () => {
    if (!fontsLoaded) return Platform.OS === 'ios' ? 'System' : 'sans-serif';
    return 'Gruppo';
  };

  // Simplified loading indicator while fonts load
  if (!fontsLoaded) {
    return (
      <View style={[styles.container, backgroundColor && { backgroundColor }]}>
        <View style={styles.headerRow}>
          {showBack && (
            <Pressable style={styles.backButton} disabled={true}>
              <ChevronLeft size={24} color="#ddd" />
            </Pressable>
          )}
          <View style={styles.titleContainer}>
            <Text style={[styles.titleFallback]}>
              {title}
            </Text>
          </View>
          {rightElement && (
            <View style={styles.rightElementContainer}>
              {rightElement}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, backgroundColor && { backgroundColor }]}>
      <View style={styles.headerRow}>
        {showBack && (
          <Pressable style={styles.backButton} onPress={navigateBack}>
            <ChevronLeft size={24} color="#0e9ab5" />
          </Pressable>
        )}
        <View style={styles.titleContainer}>
          <Text style={[
            styles.title, 
            { fontFamily: getFontFamily() },
            textColor && { color: textColor }
          ]}>
            <Text style={{ color: '#0a202b' }}></Text> {title} <Text style={{ color: '#0a202b' }}></Text>
          </Text>
          {subtitle && (
            <Text style={[
              styles.subtitle, 
              { fontFamily: getFontFamily() },
              textColor && { color: textColor }
            ]}>
              {subtitle}
            </Text>
          )}
          {showVersion && (
            <Text style={styles.versionTag}>v1.2</Text>
          )}
        </View>
        {rightElement && (
          <View style={styles.rightElementContainer}>
            {rightElement}
          </View>
        )}
        {children && <View style={styles.actions}>{children}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    padding: 4,
    color: '#0e9ab5',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    fontFamily: 'Gruppo_400Regular',
  },
  titleFallback: {
    fontSize: 25,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: 'bold',
    padding: 4,
    color: '#0e9ab5',
    textAlign: 'center',
    fontFamily: 'Gruppo_400Regular',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontFamily: 'Gruppo_400Regular',
  },
  rightElementContainer: {
    marginLeft: 'auto',
  },
  actions: {
    marginLeft: 8,
  },
  versionTag: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#999',
    position: 'absolute',
    right: 2,
    top: 2,
    fontFamily: 'Gruppo_400Regular',
  }
});