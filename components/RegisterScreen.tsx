import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import { launchImageLibrary } from 'react-native-image-picker';
import { CLOUDINARY_CONFIG } from '../config';


const { width, height } = Dimensions.get('window');

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  const selectImage = () => {
    const options = {
      maxWidth: 512,
      maxHeight: 512,
      storageOptions: {
        skipBackup: true,
        path: 'images',
      },
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
        Alert.alert('Error', 'Gagal memilih gambar');
      } else if (response.assets && response.assets.length > 0) {
        setProfileImage(response.assets[0]);
      }
    });
  };

  const uploadToCloudinary = async (imageUri) => {
    if (!imageUri) return null;

    try {
      // Cloudinary upload preset (you need to create this in your Cloudinary dashboard)
      const CLOUDINARY_URL = CLOUDINARY_CONFIG.CLOUDINARY_URL;
      const UPLOAD_PRESET = CLOUDINARY_CONFIG.CLOUDINARY_UPLOAD_PRESET; // Create this in your Cloudinary dashboard

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg', // You may need to dynamically determine this
        name: 'profile_image.jpg',
      });
      formData.append('upload_preset', UPLOAD_PRESET);

      // Send request to Cloudinary
      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();
      if (data.secure_url) {
        return data.secure_url;
      } else {
        console.error('Cloudinary upload failed:', data);
        return null;
      }
    } catch (error) {
      console.error('Upload image error:', error);
      return null;
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Peringatan', 'Semua bidang harus diisi!');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Peringatan', 'Password dan Konfirmasi Password tidak cocok!');
      return;
    }

    setLoading(true);

    try {
      // Cek apakah nama sudah digunakan di Realtime Database
      const snapshot = await database()
        .ref('users')
        .orderByChild('name')
        .equalTo(name)
        .once('value');

      if (snapshot.exists()) {
        setLoading(false);
        Alert.alert('Peringatan', 'Nama sudah digunakan, silakan pilih nama lain!');
        return;
      }

      // Registrasi pengguna
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const userId = userCredential.user.uid;

      // Upload profile image to Cloudinary if selected
      let profileImageUrl = null;
      if (profileImage) {
        profileImageUrl = await uploadToCloudinary(profileImage.uri);
      }

      // Default avatar URL if no image was uploaded or upload failed
      const defaultAvatarUrl = "https://ui-avatars.com/api/?name=" + encodeURIComponent(name) + "&background=random";

      // Simpan data pengguna di Realtime Database
      await database()
        .ref(`users/${userId}`)
        .set({
          name: name,
          email: email,
          profileImage: profileImageUrl || defaultAvatarUrl,
          createdAt: new Date().toISOString(),
        });

      console.log('Registrasi berhasil');

      // Logout otomatis agar pengguna tidak langsung masuk
      await auth().signOut();
      
      Alert.alert('Registrasi Berhasil', 'Akun telah dibuat, silakan login.', [
        {
          text: 'OK',
          onPress: () => navigation.replace('Login'),
        },
      ]);
    } catch (error) {
      console.error('Registrasi gagal:', error);
      let errorMessage = 'Terjadi kesalahan, silakan coba lagi.';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email sudah digunakan!';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Format email tidak valid!';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password terlalu lemah!';
      }

      Alert.alert('Kesalahan', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Register</Text>

        {/* Profile Image Selection */}
        <View style={styles.profileImageContainer}>
          <TouchableOpacity onPress={selectImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage.uri }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.placeholderText}>Tambah Foto</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.noteText}>
            {profileImage ? 'Ketuk untuk ganti' : 'Ketuk untuk pilih foto'}
          </Text>
        </View>

        <Text style={styles.labelText}>Nama:</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          style={styles.input}
          placeholder="Masukkan nama Anda"
          placeholderTextColor="white"
        />

        <Text style={styles.labelText}>Email:</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          placeholder="Masukkan email Anda"
          placeholderTextColor="white"
        />

        <Text style={styles.labelText}>Password:</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholder="Masukkan password Anda"
          placeholderTextColor="white"
        />

        <Text style={styles.labelText}>Konfirmasi Password:</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
          placeholder="Konfirmasi password Anda"
          placeholderTextColor="white"
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            onPress={handleRegister} 
            disabled={loading} 
            style={[styles.registerButton, loading && styles.disabledButton]}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'Mendaftar...' : 'Daftar'}
            </Text>
          </TouchableOpacity>

          {/* Login link */}
          <TouchableOpacity 
            onPress={() => navigation.replace('Login')} 
            style={styles.loginLink}
          >
            <Text style={styles.loginText}>Sudah punya akun? Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#2c2b2b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  contentContainer: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'black',
    borderWidth: 2.5,
    borderColor: '#fed800',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: 'white',
  },
  labelText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    borderWidth: 2.5,
    borderColor: '#fed800',
    borderRadius: 8,
    marginBottom: 15,
    padding: 12,
    backgroundColor: 'black',
    fontSize: 16,
    color: 'white',
  },
  buttonContainer: {
    marginTop: 10,
  },
  loginLink: {
    marginTop: 20,
    alignSelf: 'center',
  },
  loginText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  registerButton: {
    backgroundColor: 'black',
    padding: 10,
    width: '70%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center', 
    borderWidth: 2.5,
    borderColor: '#fed800',
    marginTop: 10,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2.5,
    borderColor: '#fed800',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fed800',
  },
  placeholderText: {
    color: 'white',
    fontWeight: '500',
  },
  noteText: {
    marginTop: 5,
    color: 'white',
    fontSize: 14,
  },
});

export default RegisterScreen;