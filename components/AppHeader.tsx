import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Menu } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';

interface AppHeaderProps {
  showBack?: boolean;
  onBackPress?: () => void;
  onMenuPress?: () => void;
}

export default function AppHeader({ 
  showBack = false, 
  onBackPress,
  onMenuPress
}: AppHeaderProps) {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" />
      <View style={styles.container}>
        <LinearGradient
          colors={['#1b6fb7', '#93cdff', '#1b6fb7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.headerContent}>
            {showBack ? (
              <Pressable 
                onPress={handleBackPress} 
                style={styles.iconButton}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <ArrowLeft size={16} color="#FFFFFF" />
              </Pressable>
            ) : (
              <View style={styles.iconPlaceholder} />
            )}

            <View style={styles.centerContent}>
              <Image 
                source={{ uri: "https://iili.io/3ELud8v.md.png" }}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.subText}>a product of VLH INDUSTRIES</Text>
            </View>

            <Pressable 
              onPress={onMenuPress} 
              style={styles.iconButton}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Menu size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    marginTop: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    width: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    width: '100%',
    paddingTop: StatusBar.currentHeight || 0,
  },
  iconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPlaceholder: {
    width: 32,
    height: 32,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    marginTop: 10,
    marginBottom: 10
  },
  logoImage: {
    width: 200,
    height: 50,
    marginBottom: 4,
  },
  subText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Gruppo_400Regular',
  },
}); 