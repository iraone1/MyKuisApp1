import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, ActivityIndicator, Image } from 'react-native';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';

const DEFAULT_PROFILE_PIC = 'https://png.pngtree.com/element_our/20190530/ourmid/pngtree-correct-icon-image_1267804.jpg';

const ResultScreen = ({ route, navigation }) => {
  const { score = 0, totalQuestions = 10, category = 'Tidak diketahui' } = route.params || {}; 
  const percentage = ((score / totalQuestions) * 100);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState({
    uid: '',
    name: '',
    email: '',
    profileImage: '',
  });

  useEffect(() => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    const userRef = database().ref(`users/${currentUser.uid}`);

    const fetchUserData = async () => {
      try {
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        if (userData) {
          setUser({
            uid: currentUser.uid,
            name: userData.name || currentUser.email, 
            email: currentUser.email,
            // Check both profileImage and profilePic to ensure compatibility
            profileImage: userData.profileImage || userData.profilePic || DEFAULT_PROFILE_PIC,
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleSaveScore = useCallback(async (navigateTo) => {
    setLoading(true);
    try {
      console.log('Menyimpan skor ke Realtime Database...');

      await database().ref('leaderboard').push({
        userId: user.uid,
        name: user.name, 
        score,
        profilePic: user.profileImage, // Use the profileImage field
        category,
        timestamp: database.ServerValue.TIMESTAMP,
      });

      console.log('Skor berhasil disimpan!');
      navigation.replace(navigateTo);
    } catch (error) {
      console.error('Error saving score:', error);
    } finally {
      setLoading(false);
    }
  }, [user, score, category, navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: '#2c2b2b', }}>
    
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20,color:'white' }}>Hasil Kuis</Text>
  <Image 
        source={{ uri: user.profileImage || DEFAULT_PROFILE_PIC }}
        style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 20,borderColor: '#fed800',borderWidth:2.5 }}
        onError={() => setUser((prev) => ({ ...prev, profileImage: DEFAULT_PROFILE_PIC }))}
      />
      <Text style={{ fontSize: 18, fontStyle: 'italic', marginBottom: 10,color:'white' }}>
        Kategori: {category}
      </Text>

      <Text style={{ fontSize: 18, marginBottom: 10,color:'white'}}>
        Skor Anda: {percentage}
      </Text>

      <Text style={{ fontSize: 18, marginBottom: 20, color: percentage >= 70 ? 'green' : 'red' }}>
        {percentage >= 70 ? '🎉Congratulations ! Kamu Hebat ' : 'Coba lagi!, You can do better than this'}
      </Text>

    

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <View style={{ width: '50%' }}>
          <Button title="Confirm" onPress={() => handleSaveScore('Main')} />
        </View>
      )}
    </View>
  );
};

export default ResultScreen;