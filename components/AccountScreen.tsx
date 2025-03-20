import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';

const DEFAULT_PROFILE_PIC = 'https://png.pngtree.com/element_our/20190530/ourmid/pngtree-correct-icon-image_1267804.jpg';

const AccountScreen = ({ navigation }) => {
  const user = auth().currentUser;
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState({
    name: '',
    profileImage: ''
  });

  useEffect(() => {
    if (user) {
      // Using on() instead of once() to listen for changes to the user data
      const userRef = database().ref(`/users/${user.uid}`);
      
      const userListener = userRef.on('value', snapshot => {
        setLoading(true);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setItem({
            name: userData.name || 'User',
            // Check for both profileImage and profilePic fields for compatibility
            profileImage: userData.profileImage || userData.profilePic || DEFAULT_PROFILE_PIC
          });
        } else {
          // If user data doesn't exist, set defaults
          setItem({
            name: user.displayName || 'User',
            profileImage: DEFAULT_PROFILE_PIC
          });
        }
        setLoading(false);
      }, error => {
        console.error('Error fetching user data:', error);
        setLoading(false);
      });
      
      // Cleanup listener on component unmount
      return () => userRef.off('value', userListener);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await auth().signOut();
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Profile Photo */}
      <View style={styles.profileContainer}>
        <Image 
          source={{ uri: item.profileImage || DEFAULT_PROFILE_PIC }} 
          style={styles.profileImage} 
        />
      </View>

      {/* Username */}
     

      {/* Edit Profile Button */}
      <TouchableOpacity 
        onPress={() => navigation.navigate('EditProfile')} 
        style={styles.button}
      >
        <Text style={styles.buttonText}>Informasi Profil</Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity 
        style={[styles.button, styles.logoutButton]}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Keluar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
     backgroundColor: '#2c2b2b',
     justifyContent:'center',
  },
  loadingContainer: {
    justifyContent: 'center',
  },
  profileContainer: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom:30
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    borderWidth: 2.5,
    
    borderColor: '#fed800',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 20,
    color:'white'
  },
  button: {
    backgroundColor: 'black',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2.5,
    borderColor: '#fed800',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  logoutButton: {
    backgroundColor: 'black',
    marginTop: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default AccountScreen;