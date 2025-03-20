import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const ChangeNameScreen = ({ navigation }) => {
  const [name, setName] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Nama tidak boleh kosong!');
      return;
    }

    try {
      const user = auth().currentUser;
      await firestore().collection('users').doc(user.uid).update({ name });
      Alert.alert('Success', 'Nama berhasil diperbarui!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Gagal memperbarui nama.');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ marginBottom: 10 }}>Ubah Nama:</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
        placeholder="Masukkan nama baru"
      />
      <Button title="Simpan" onPress={handleSave} />
    </View>
  );
};

export default ChangeNameScreen;
