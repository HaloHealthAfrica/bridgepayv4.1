import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth, useRequireAuth } from '@/utils/auth/useAuth';

export default function Index() {
  const { isAuthenticated, isReady, auth, signOut } = useAuth();
  
  // Automatically show auth modal if not authenticated
  useRequireAuth({ mode: 'signin' });

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    // Auth modal will be shown automatically by useRequireAuth
    return (
      <View style={styles.container}>
        <Text style={styles.welcomeText}>Welcome to Bridge</Text>
        <Text style={styles.subtitleText}>Please sign in to continue</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome back!</Text>
      <Text style={styles.userText}>{auth?.user?.name || auth?.user?.email || 'User'}</Text>
      
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Mobile App</Text>
        <Text style={styles.sectionText}>
          Your mobile wallet and payment features will be available here.
        </Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={signOut}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  userText: {
    fontSize: 18,
    color: '#10b981',
    marginBottom: 32,
    textAlign: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
