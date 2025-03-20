import React, { useState, useEffect } from 'react'; 
import { View, TextInput, Button, Alert, Image, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, PermissionsAndroid } from 'react-native';
import database from '@react-native-firebase/database';
import { launchImageLibrary } from 'react-native-image-picker';
import auth from '@react-native-firebase/auth';
import RNFS from 'react-native-fs';
import { CLOUDINARY_CONFIG } from '../config';

// Cloudinary configuration (unchanged)
const CLOUDINARY_URL = CLOUDINARY_CONFIG.CLOUDINARY_URL;
const CLOUDINARY_DELETE_URL = CLOUDINARY_CONFIG.CLOUDINARY_DELETE_URL;
const CLOUDINARY_UPLOAD_PRESET = CLOUDINARY_CONFIG.CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_API_KEY = CLOUDINARY_CONFIG.CLOUDINARY_API_KEY;

const EditProfileScreen = ({ navigation }) => {
  // State variables (unchanged)
  const user = auth().currentUser;
  const [name, setName] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageChanged, setImageChanged] = useState(false);
  const [originalName, setOriginalName] = useState('');
  const [userData, setUserData] = useState(null);
  const [currentImagePublicId, setCurrentImagePublicId] = useState(null);

  // Functionality code (unchanged)
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      
      // Get data from Realtime Database
      database()
        .ref(`/users/${user.uid}`)
        .once('value')
        .then(snapshot => {
          if (snapshot.exists()) {
            const userDataFromDB = snapshot.val();
            setUserData(userDataFromDB);
            setName(userDataFromDB.name || '');
            setOriginalName(userDataFromDB.name || '');
            
            // Set profile picture URL and public ID if available
            if (userDataFromDB.profileImage) {
              setProfilePic(userDataFromDB.profileImage);
            }
            if (userDataFromDB.profileImageId) {
              setCurrentImagePublicId(userDataFromDB.profileImageId);
            }
          }
        })
        .catch(error => {
          console.error('Error fetching user data:', error);
        });
    }
  }, [user]);

  // Request storage permission (for Android) - unchanged
  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;
    
    try {
      // For Android 13+ (API level 33+), use new permissions
      if (Platform.Version >= 33) {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
        ];
        
        const results = await PermissionsAndroid.requestMultiple(permissions);
        return (
          results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === 'granted' ||
          results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] === 'granted'
        );
      } 
      // For Android 12 or lower
      else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: "Izin Akses Galeri",
            message: "Aplikasi membutuhkan izin untuk mengakses galeri Anda",
            buttonNeutral: "Tanya Nanti",
            buttonNegative: "Batal",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  // All other functions remain unchanged
  const getBase64FromUri = async (uri) => {
    try {
      const base64 = await RNFS.readFile(uri, 'base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  };

  const deleteFromCloudinary = async (publicId) => {
    if (!publicId) {
      console.log('No public ID provided for deletion');
      return false;
    }
    
    try {
      console.log('Attempting to delete image with public ID:', publicId);
      
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('api_key', CLOUDINARY_API_KEY);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      
      const response = await fetch(CLOUDINARY_DELETE_URL, {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      console.log('Cloudinary delete response:', result);
      
      if (result.result === 'ok') {
        console.log('Old image successfully deleted from Cloudinary');
        return true;
      } else {
        console.warn('Failed to delete old image:', result);
        return false;
      }
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      return false;
    }
  };
  
  const uploadToCloudinary = async (base64Image, specificPublicId = null) => {
    try {
      setImageLoading(true);
      
      let base64Data = base64Image;
      if (base64Image.startsWith('data:image')) {
        base64Data = base64Image.split(',')[1];
      }
      
      const uniqueId = specificPublicId || `profile_${user.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      const formData = new FormData();
      formData.append('file', `data:image/jpeg;base64,${base64Data}`);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('public_id', uniqueId);
      
      console.log('Uploading to Cloudinary with ID:', uniqueId);
      
      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Upload successful', data);
      
      return {
        url: data.secure_url,
        publicId: data.public_id
      };
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    } finally {
      setImageLoading(false);
    }
  };

  const selectImage = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert('Izin Diperlukan', 'Aplikasi membutuhkan izin untuk mengakses galeri');
      return;
    }
    
    const options = {
      mediaType: 'photo',
      quality: 0.7,
      maxWidth: 600,
      maxHeight: 600,
      includeBase64: false,
    };
    
    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error:', response.errorCode, response.errorMessage);
        Alert.alert('Error', `Terjadi kesalahan saat memilih gambar: ${response.errorMessage}`);
      } else if (response.assets && response.assets.length > 0) {
        setImageLoading(true);
        
        try {
          const selectedUri = response.assets[0].uri;
          console.log('Selected image URI:', selectedUri);
          
          const base64String = await getBase64FromUri(selectedUri);
          
          setProfilePic(base64String);
          setImageChanged(true);
          
        } catch (error) {
          console.error('Error processing selected image:', error);
          Alert.alert('Error', 'Gagal memproses gambar yang dipilih');
        } finally {
          setImageLoading(false);
        }
      } else {
        Alert.alert('Error', 'Tidak dapat memilih gambar, silakan coba lagi');
      }
    });
  };

  const updateLeaderboardEntries = async (oldName, newName) => {
    if (oldName === newName) return;
    
    try {
      const leaderboardSnapshot = await database()
        .ref('/leaderboard')
        .orderByChild('userId')
        .equalTo(user.uid)
        .once('value');
      
      if (leaderboardSnapshot.exists()) {
        const updates = {};
        
        leaderboardSnapshot.forEach(child => {
          const entryKey = child.key;
          updates[`/leaderboard/${entryKey}/name`] = newName;
        });
        
        if (Object.keys(updates).length > 0) {
          await database().ref().update(updates);
          console.log('Leaderboard entries updated successfully');
        }
      }
    } catch (error) {
      console.error('Error updating leaderboard entries:', error);
    }
  };

  const updateFriendEntries = async (oldName, newName) => {
    if (oldName === newName) return;
    
    try {
      const friendsSnapshot = await database()
        .ref('/friends')
        .once('value');
      
      if (friendsSnapshot.exists()) {
        const updates = {};
        
        friendsSnapshot.forEach(userNode => {
          const userId = userNode.key;
          
          if (userNode.hasChild(user.uid)) {
            updates[`/friends/${userId}/${user.uid}/name`] = newName;
          }
        });
        
        if (Object.keys(updates).length > 0) {
          await database().ref().update(updates);
          console.log('Friend entries updated successfully');
        }
      }
    } catch (error) {
      console.error('Error updating friend entries:', error);
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'User tidak ditemukan');
      return;
    }
  
    if (!name.trim()) {
      Alert.alert('Error', 'Nama tidak boleh kosong');
      return;
    }
  
    setLoading(true);
  
    try {
      if (name !== originalName) {
        const usersSnapshot = await database().ref('/users').orderByChild('name').equalTo(name).once('value');
        
        if (usersSnapshot.exists()) {
          Alert.alert('Error', 'Nama sudah digunakan oleh pengguna lain');
          setLoading(false);
          return;
        }
      }
  
      const updateData = { ...userData };
      updateData.name = name;
      
      if (imageChanged && profilePic && profilePic.startsWith('data:image')) {
        try {
          Alert.alert('Info', 'Mengunggah gambar profil, mohon tunggu...', [], { cancelable: false });
          
          if (currentImagePublicId) {
            console.log('Found existing profile image to delete:', currentImagePublicId);
            try {
              await deleteFromCloudinary(currentImagePublicId);
              console.log('Successfully deleted previous profile image');
            } catch (deleteError) {
              console.error('Error deleting old image, but continuing with upload:', deleteError);
            }
          }
          
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 10);
          const uniqueImageId = `profile_${user.uid}_${timestamp}_${randomString}`;
          
          const uploadResult = await uploadToCloudinary(profilePic, uniqueImageId);
          
          updateData.profileImage = uploadResult.url;
          updateData.profileImageId = uploadResult.publicId;
          
          console.log('Profile image updated with new URL:', uploadResult.url);
          console.log('New profile image public ID:', uploadResult.publicId);
        } catch (error) {
          console.error('Error handling profile image update:', error);
          Alert.alert('Warning', 'Profil akan diperbarui tetapi gambar gagal diunggah');
        }
      }
      
      await database()
        .ref(`/users/${user.uid}`)
        .update(updateData);
  
      await updateLeaderboardEntries(originalName, name);
      await updateFriendEntries(originalName, name);
  
      Alert.alert('Sukses', 'Profil berhasil diperbarui!', [
        { text: 'OK', onPress: () => navigation.replace('Main') }
      ]);
      
      setImageChanged(false);
    } catch (error) {
      console.log('Error updating profile: ', error);
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const navigateToChangePassword = () => {
    navigation.navigate('ChangePassword');
  };
  
  // New function to navigate back to Home
  const navigateToHome = () => {
    navigation.replace('Main');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileContainer}>
        <Text style={styles.headerText}>Profileku</Text>
        
        <View style={styles.imageSection}>
          {imageLoading ? (
            <View style={[styles.profileImage, styles.loadingContainer]}>
              <ActivityIndicator size="large" color="#FED800" />
            </View>
          ) : profilePic ? (
            <Image 
              source={{ uri: profilePic }} 
              style={styles.profileImage} 
              onError={() => {
                console.log('Image failed to load:', profilePic);
                setProfilePic('');
                Alert.alert('Error', 'Gagal memuat gambar profil');
              }}
            />
          ) : (
            <View style={[styles.profileImage, styles.noImage]}>
              <Text style={styles.noImageText}>No Image</Text>
            </View>
          )}
        
          <TouchableOpacity 
            style={styles.imageButton} 
            onPress={selectImage}
            disabled={imageLoading}
          >
            <Text style={styles.buttonText}>Ubah Foto</Text>
          </TouchableOpacity>
        </View>
      
        <View style={styles.formContainer}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nama</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama Anda"
              placeholderTextColor="white"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={email}
              editable={false}
            />
          </View>

          <TouchableOpacity 
            style={styles.passwordButton} 
            onPress={navigateToChangePassword}
          >
            <Text style={styles.buttonText}>Ubah Password</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.saveButton, (loading || imageLoading) && styles.disabledButton]}
              onPress={handleSave}
              disabled={loading || imageLoading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Simpan</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.homeButton}
              onPress={navigateToHome}
            >
              <Text style={styles.buttonText}>Home</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              Catatan: Gambar profil disimpan di cloud dan akan tersedia di semua perangkat.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    paddingBottom: 32,
    backgroundColor: '#2c2b2b',
  },
  profileContainer: {
    borderRadius: 16,
    borderColor: '#FED800',
    borderWidth: 2.5,
    backgroundColor: 'black',
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    paddingVertical: 16,
    backgroundColor: 'black',
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
    borderWidth: 2.5,
    borderColor: '#FED800',
  },
  noImage: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#FED800',
    fontSize: 16,
    fontWeight: '500',
  },
  imageButton: {
    backgroundColor: 'black',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderColor: '#FED800',
    borderWidth: 2.5,
  },
  formContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: 'white',
    paddingLeft: 4,
  },
  input: {
    height: 50,
    borderWidth: 2.5,
    borderColor: '#FED800',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: 'black',
    color: '#FFF',
  },
  disabledInput: {
    backgroundColor: 'black',
    color: '#BBB',
    borderWidth: 2.5,
    borderColor: '#FED800',
  },
  passwordButton: {
    backgroundColor: 'black',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2.5,
    borderColor: '#FED800',
  },
  buttonRow: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: 'black',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FED800',
    borderWidth: 2.5,
  },
  homeButton: {
    backgroundColor: 'black',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FED800',
    borderWidth: 2.5,
  },
  disabledButton: {
    backgroundColor: '#060606',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  noteContainer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: 'rgba(50,50,50,0.7)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FED800',
  },
  noteText: {
    fontSize: 14,
    color: '#DDD',
    lineHeight: 20,
  }
});

export default EditProfileScreen;