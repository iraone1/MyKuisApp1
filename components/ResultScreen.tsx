import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, ActivityIndicator, Image } from 'react-native';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';

const DEFAULT_PROFILE_PIC = 'https://png.pngtree.com/element_our/20190530/ourmid/pngtree-correct-icon-image_1267804.jpg';

const ResultScreen = ({ route, navigation }) => {
  const { score = 0, category = 'Tidak diketahui' } = route.params || {}; 
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({
    uid: '',
    name: '',
    email: '',
    profileImage: '',
  });

  // Fetch the questions from the database to get the actual count
  useEffect(() => {
    const fetchQuestionCount = async () => {
      try {
        const questionsRef = database().ref(`questions/${category}`);
        const snapshot = await questionsRef.once('value');
        const questions = snapshot.val() || {};
        const count = questions ? Object.keys(questions).length-1 : 0;
        
        setTotalQuestions(count); // Default to 10 if no questions found
        setPercentage(((score / count) * 100));
      } catch (error) {
        console.error('Error fetching question count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionCount();
  }, [category, score]);

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
      console.log('Menyimpan `skor` ke Realtime Database...');

      await database().ref('leaderboard').push({
        userId: user.uid,
        name: user.name, 
        score: percentage, // Store the percentage score
        totalQuestions: totalQuestions, // Store total questions for reference
        rawScore: score, // Store original score for reference
        profilePic: user.profileImage, // Use the profileImage field
        category,
        timestamp: database.ServerValue.TIMESTAMP,
        startTime: route.params?.startTime || Date.now() - 1000, // Fallback if not provided
        endTime: Date.now(), // Current time as end time
      });

      console.log('Skor berhasil disimpan!');
      navigation.replace(navigateTo);
    } catch (error) {
      console.error('Error saving score:', error);
    } finally {
      setLoading(false);
    }
  }, [user, score, percentage, totalQuestions, category, navigation, route.params]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2c2b2b' }}>
        <ActivityIndicator size="large" color="#fed800" />
        <Text style={{ marginTop: 10, color: 'white' }}>Memuat hasil...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: '#2c2b2b' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: 'white' }}>Hasil Kuis</Text>
      <Image 
        source={{ uri: user.profileImage || DEFAULT_PROFILE_PIC }}
        style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 20, borderColor: '#fed800', borderWidth: 2.5 }}
        onError={() => setUser((prev) => ({ ...prev, profileImage: DEFAULT_PROFILE_PIC }))}
      />
      <Text style={{ fontSize: 18, fontStyle: 'italic', marginBottom: 10, color: 'white' }}>
        Kategori: {category}
      </Text>

      <Text style={{ fontSize: 18, marginBottom: 5, color: 'white' }}>
        Jawaban Benar: {score} / {totalQuestions}
      </Text>

      <Text style={{ fontSize: 18, marginBottom: 10, color: 'white' }}>
        Persentase: {percentage.toFixed(1)}%
      </Text>

      <Text style={{ fontSize: 18, marginBottom: 20, color: percentage >= 70 ? 'green' : 'red' }}>
        {percentage >= 70 ? '🎉Congratulations! Kamu Hebat' : 'Coba lagi! You can do better than this'}
      </Text>

      <View style={{ width: '50%' }}>
        <Button title="Confirm" onPress={() => handleSaveScore('Main')} />
      </View>
    </View>
  );
};

export default ResultScreen;