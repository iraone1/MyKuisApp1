import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';

const ChangePasswordScreen = ({ navigation }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password baru harus minimal 6 karakter!');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Password konfirmasi tidak sesuai!');
      return;
    }

    setLoading(true);
    
    try {
      const user = auth().currentUser;
      
      // This is the correct way to get the credential in recent versions
      const credential = auth.EmailAuthProvider.credential(
        user.email, 
        oldPassword
      );
      
      // Reauthenticate
      await user.reauthenticateWithCredential(credential);
      
      // Update password
      await user.updatePassword(newPassword);

      Alert.alert('Success', 'Password berhasil diubah!');
      navigation.goBack();
    } catch (error) {
      console.error('Password change error:', error.message);
      
      // More specific error messages
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Password lama tidak benar.');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Error', 'Password baru terlalu lemah.');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Error', 'Sesi login telah kedaluwarsa. Silakan login kembali.');
        // Consider signing the user out and redirecting to login
        // auth().signOut();
        // navigation.navigate('Login');
      } else {
        Alert.alert('Error', `Gagal mengubah password: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#2c2b2b', }}>
      <Text style={{ marginBottom: 10,color:'white' }}>Password Lama:</Text>
      <TextInput
        secureTextEntry
        value={oldPassword}
        onChangeText={setOldPassword}
        style={{ borderWidth: 1, padding: 10, marginBottom: 20, borderRadius: 5 }}
        placeholder="Masukkan password lama"
      />
      <Text>Password Baru:</Text>
      <TextInput
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        style={{ borderWidth: 1, padding: 10, marginBottom: 20, borderRadius: 5 }}
        placeholder="Masukkan password baru"
      />
      <Text>Konfirmasi Password:</Text>
      <TextInput
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={{ borderWidth: 1, padding: 10, marginBottom: 20, borderRadius: 5 }}
        placeholder="Konfirmasi password baru"
      />
      <Button 
        title={loading ? "Menyimpan..." : "Simpan"} 
        onPress={handleChangePassword} 
        disabled={loading}
      />
    </View>
  );
};

export default ChangePasswordScreen;