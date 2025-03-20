import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import PostScreen from './PostScreen';
import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import FriendsListScreen from './FriendsListScreen';

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const user = auth().currentUser;
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState({ name: 'User' });

  useEffect(() => {
    if (user) {
      const userRef = database().ref(`/users/${user.uid}`);

      const userListener = userRef.on('value', (snapshot) => {
        setLoading(true);
        if (snapshot.exists()) {
          setItem({ name: snapshot.val().name || 'User' });
        } else {
          setItem({ name: user.displayName || 'User' });
        }
        setLoading(false);
      });

      return () => userRef.off('value', userListener);
    }
  }, [user]);

  const handleQuizSelection = (category) => {
    if (navigation?.navigate) {
      navigation.replace('Quiz', { category });
    }
  };

  // Updated quizCategories with different images for each category
  const quizCategories = [
    { 
      id: 'MTK', 
      name: 'Matematika', 
      foto: require('../assets/pngtree-math-clipart-cartoon-math-book-png-image_6086529-removebg-preview.png') 
    },
    { 
      id: 'IPA', 
      name: 'Ilmu Pengetahuan Alam', 
      foto: require('../assets/depositphotos_62375373-stock-illustration-open-book-with-science-elements-removebg-preview.png') 
    },
    { 
      id: 'IPS', 
      name: 'Ilmu Pengetahuan Sosial', 
      foto: require('../assets/images-removebg-preview.png') 
    },
    { 
      id: 'Algoritma', 
      name: 'Algoritma Pemrograman', 
      foto: require('../assets/pngtree-robot-reading-a-book-education-clipart-illustration-png-image_13758792-removebg-preview.png') 
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.subtitle}>Selamat Datang, {item.name}</Text>
          </View>

          <View style={styles.quizRow}>
            <FriendsListScreen />
          </View>
          <View style={styles.quizRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {quizCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.quizCard}
                  onPress={() => handleQuizSelection(category.id)}
                >
                  <Image source={category.foto} style={styles.backgroundImage} />
                  <View style={styles.overlay}>
                    <Text style={styles.quizCardText}>{category.id}</Text>
                    <Text numberOfLines={2} style={styles.quizCardSubtext}>
                      {category.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.postCol}>
            <PostScreen />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: SCREEN_WIDTH * 0.02,
    backgroundColor: '#2c2b2b',
  },
  header: {
    marginBottom: SCREEN_HEIGHT * 0.02,
    paddingVertical: SCREEN_HEIGHT * 0.01,
  },
  subtitle: {
    fontWeight: 'bold',
    fontSize: SCREEN_WIDTH * 0.05,
    color: '#f6f5f5',
    textAlign: 'center'
  },
  quizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'black',
    padding: SCREEN_WIDTH * 0.02,
    marginVertical: SCREEN_HEIGHT * 0.02,
    borderRadius: SCREEN_WIDTH * 0.025,
    borderWidth: 2,
    borderColor: '#fed800',
  },
  postCol: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'black',
    padding: SCREEN_WIDTH * 0.02,
    marginVertical: SCREEN_HEIGHT * 0.02,
    borderRadius: SCREEN_WIDTH * 0.025,
    borderWidth: 2,
    borderColor: '#fed800',
  },
  quizCard: {
    width: SCREEN_WIDTH * 0.3,
    height: SCREEN_WIDTH * 0.3,
    borderRadius: SCREEN_WIDTH * 0.03,
    overflow: 'hidden',
    marginHorizontal: SCREEN_WIDTH * 0.02,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    borderRadius: SCREEN_WIDTH * 0.03,
    borderWidth: 2.5,
    borderColor: '#fed800',
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SCREEN_WIDTH * 0.02,
  },
  quizCardText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: SCREEN_WIDTH * 0.055,
    textAlign: 'center',
  },
  quizCardSubtext: {
    color: '#fff',
    fontSize: SCREEN_WIDTH * 0.04,
    textAlign: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.02,
  },
});

export default HomeScreen;