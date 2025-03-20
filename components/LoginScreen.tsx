import React, { useState } from 'react';
import { View, Text, TextInput, Alert, ImageBackground, StyleSheet, Dimensions, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import auth from '@react-native-firebase/auth';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Peringatan', 'Email dan password tidak boleh kosong!');
      return;
    }
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
      console.log('Login berhasil, navigasi ke Main...');
      navigation.replace('Main');
    } catch (error) {
      console.log('Login gagal:', error);
      let errorMessage = 'Terjadi kesalahan, silakan coba lagi.';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Email tidak terdaftar!';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Password salah!';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Format email tidak valid!';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Terlalu banyak percobaan login, coba lagi nanti.';
      }

      Alert.alert('Login Gagal', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/depicting-3d-rendering-of-an-adorable-ai-robot-reading-a-book-the-concept-machine-learning_9757190.jpg')}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
      resizeMode="cover"
    >
          <View style={styles.overlay}>
            <View style={styles.container}>
              <Text style={styles.titleText}>Login</Text>
              <Text style={styles.labelText}>Email:</Text>
              <TextInput
                value={email}
               
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                placeholderTextColor="white"
                placeholder="Masukkan email Anda"
              />
              <Text style={styles.labelText}>Password:</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                placeholderTextColor="white"
                placeholder="Masukkan password Anda"
              />

              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerContainer}
                onPress={() => navigation.replace('Register')}
              >
                <Text style={styles.registerText}>Belum punya akun? </Text>
                <Text style={styles.registerLink}>Klik di sini</Text>
              </TouchableOpacity>
            </View>
          </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: width,
    height: '100%',
  },
  backgroundImageStyle: {
    transform: [{ scale: 1.0001 }], // Zoom effect on image
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: '90%',
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 2.5,
    borderColor: '#fed800',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    color: 'white',
    textAlign: 'center',
  },
  labelText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
    alignSelf: 'flex-start',
  },
  input: {
    width: '100%',
    borderWidth: 2.5,
    borderColor: '#fed800',
    borderRadius: 16,
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'black',
    fontSize: 16,
    color: 'white',
  },
  loginButton: {
    width: '60%',
    padding: 12,
    borderRadius: 30,
    backgroundColor: 'black',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2.5,
    borderColor: '#fed800',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    marginTop: 15,
  },
  registerText: {
    color: 'white',
    fontSize: 16,
  },
  registerLink: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
