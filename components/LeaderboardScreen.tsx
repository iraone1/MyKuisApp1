import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Image } from 'react-native';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { Picker } from '@react-native-picker/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';

const LeaderboardScreen = ({ route }) => {
  const initialCategory = route?.params?.category || '';
  
  const [category, setCategory] = useState(initialCategory);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [friends, setFriends] = useState({});
  const [friendRequests, setFriendRequests] = useState({});
  const [userName, setUserName] = useState('');
  const [userProfilePic, setUserProfilePic] = useState('');

  const options = {
    IPA: 'Ilmu Pengetahuan Alam',
    MTK: 'Matematika',
    IPS: 'Ilmu Pengetahuan Sosial',
    Algoritma: 'Algoritma',
  };

  // Mengambil user ID dan data pengguna dari tabel users
  useEffect(() => {
    const unsubscribeAuth = auth().onAuthStateChanged(user => {
      if (user) {
        const uid = user.uid;
        setUserId(uid);
        
        // Mengambil data pengguna dari tabel users
        const userRef = database().ref(`/users/${uid}`);
        userRef.once('value', snapshot => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setUserName(userData.name || '');
            setUserProfilePic(userData.profilePic || '');
          } else {
            // Fallback ke data dari auth jika tidak ada di users table
            setUserName(user.displayName || '');
            setUserProfilePic(user.photoURL || '');
          }
        });
        
        fetchFriends(uid);
        fetchFriendRequests(uid);
      } else {
        setUserId(null);
      }
    });

    return unsubscribeAuth;
  }, []);

  // Mengambil daftar teman dari Firebase
  const fetchFriends = (uid) => {
    const friendsRef = database().ref(`/friends/${uid}`);
    friendsRef.on('value', snapshot => {
      setFriends(snapshot.exists() ? snapshot.val() : {});
    });
  };

  // Mengambil daftar permintaan pertemanan yang dikirim
  const fetchFriendRequests = (uid) => {
    const requestsRef = database().ref(`/friend_requests`);
    requestsRef.on('value', snapshot => {
      if (snapshot.exists()) {
        const requests = snapshot.val();
        let sentRequests = {};
        Object.keys(requests).forEach(receiverId => {
          if (requests[receiverId][uid]) {
            sentRequests[receiverId] = requests[receiverId][uid];
          }
        });
        setFriendRequests(sentRequests);
      } else {
        setFriendRequests({});
      }
    });
  };

  // Mengambil data leaderboard dari Firebase dan menyaring skor tertinggi per pengguna
  useEffect(() => {
    if (!category) return;

    setLoading(true);
    const leaderboardRef = database().ref('/leaderboard');

    leaderboardRef.on('value', snapshot => {
      if (snapshot.exists()) {
        const rawData = snapshot.val();
        let scoresByUser = {};

        // Filter dan simpan skor tertinggi setiap pengguna
        Object.keys(rawData).forEach(key => {
          const entry = {
            id: key,
            ...rawData[key],
            duration: rawData[key].endTime - rawData[key].startTime,
          };

          // Calculate percentage score if needed
          if (entry.category === category) {
            // Calculate the score percentage if totalQuestions exists and score is not already a percentage
            // This ensures compatibility with both old and new data formats
            const scoreValue = entry.totalQuestions 
              ? ((entry.rawScore / entry.totalQuestions) * 100) 
              : entry.score;
              
            if (!scoresByUser[entry.userId] || scoresByUser[entry.userId].scoreValue < scoreValue) {
              scoresByUser[entry.userId] = {
                ...entry,
                scoreValue: scoreValue // Store calculated percentage for sorting
              };
            }
          }
        });

        // Ubah ke array dan urutkan
        const sortedData = Object.values(scoresByUser)
          .sort((a, b) => (b.scoreValue !== a.scoreValue ? b.scoreValue - a.scoreValue : a.duration - b.duration))
          .slice(0, 10);

        setLeaderboard(sortedData);
      } else {
        setLeaderboard([]);
      }
      setLoading(false);
    });

    return () => leaderboardRef.off('value');
  }, [category]);

  // Fungsi menambahkan permintaan pertemanan
  const sendFriendRequest = (friendId, friendName, friendProfilePic) => {
    if (!userId) return Alert.alert("Gagal", "Anda harus login untuk menambahkan teman.");
    if (friendId === userId) return Alert.alert("Info", "Anda tidak bisa menambahkan diri sendiri sebagai teman.");

    const friendRequestRef = database().ref(`/friend_requests/${friendId}/${userId}`);

    friendRequestRef.once('value')
      .then(snapshot => {
        if (snapshot.exists()) {
          Alert.alert("Info", `Anda sudah mengirim permintaan pertemanan ke ${friendName}.`);
        } else {
          friendRequestRef
            .set({
              senderId: userId,
              senderName: userName,
              profilePic: userProfilePic || '',
              status: "pending",
            })
            .then(() => Alert.alert("Sukses", `Permintaan pertemanan ke ${friendName} telah dikirim.`))
            .catch(error => Alert.alert("Gagal", `Gagal mengirim permintaan pertemanan: ${error.message}`));
        }
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard {category ? options[category] : ''}</Text>

      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={category}
          onValueChange={setCategory}
          style={styles.picker}
          dropdownIconColor="white"
          itemStyle={{backgroundColor: 'black'}} 
        >
          <Picker.Item label="Pilih Mata Pelajaran" value="" enabled={false} color='gray' style={{backgroundColor: 'black'}} />
          {Object.entries(options).map(([key, label]) => (
            <Picker.Item key={key} label={label} value={key} color="white" style={{backgroundColor: 'black'}} />
          ))}
        </Picker>
      </View>

      {category === '' ? (
        <Text style={styles.chooseCategoryText}>Silakan pilih mata pelajaran untuk melihat leaderboard.</Text>
      ) : loading ? (
        <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={item => item.id}
          ListEmptyComponent={() => <Text style={styles.emptyText}>Leaderboard kosong</Text>}
          renderItem={({ item, index }) => {
            let trophyIcon = null;
            if (index === 0) trophyIcon = <Ionicons name="trophy" size={24} color="#FFD700" />;
            else if (index === 1) trophyIcon = <Ionicons name="trophy" size={24} color="#C0C0C0" />;
            else if (index === 2) trophyIcon = <Ionicons name="trophy" size={24} color="#CD7F32" />;

            // Calculate percentage score based on totalQuestions or use scoreValue
            const scoreDisplay = item.scoreValue 
              ? `${item.scoreValue.toFixed(1)}%` 
              : `${item.score.toFixed(1)}%`;

            return (
              <View style={styles.row}>
                <Text style={styles.rank}>{index + 1}.</Text>
                <Image source={{ uri: item.profilePic || 'https://via.placeholder.com/50' }} style={styles.profilePic} />
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.score}>{scoreDisplay}</Text>
                <View style={styles.trophyContainer}>{trophyIcon}</View>
                {item.userId !== userId && !friends[item.userId] && !friendRequests[item.userId] ? (
                  <TouchableOpacity 
                    style={styles.addFriendButton} 
                    onPress={() => sendFriendRequest(item.userId, item.name, item.profilePic)}
                  >
                    <Ionicons name="person-add" size={20} color="#007bff" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.addFriendPlaceholder} />
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  profilePic: {
    width: 50,  
    height: 50,  
    borderRadius: 25, // Agar gambar menjadi lingkaran
    marginRight: 10, 
    borderWidth: 2.5,
    borderColor: '#fed800',
  },
  
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#2c2b2b', 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center',
    color:'white' 
  },
  pickerWrapper: { 
    borderColor: '#fed800', 
    borderWidth: 2.5, 
    borderRadius: 5, 
    marginBottom: 20,
    backgroundColor: 'black'// Added slight background
  },
  picker: { 
    height: 50, 
    width: '100%',
    color: 'white',
    backgroundColor: 'black',
  },
  pickerItem: {
    backgroundColor: 'black',
    color: 'white',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 30,
    marginVertical: 5,
    borderColor: '#fed800',
    borderWidth: 2.5,
  },
  rank: {
    width: 30, // Supaya angka ranking sejajar
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  name: {
    flex: 1, // Nama akan mengisi ruang yang tersedia
    fontSize: 18,
    color: 'white',
    marginLeft: 10,
  },
  addFriendPlaceholder: {
    width: 36, // Supaya sejajar dengan tombol "Tambah Teman"
    height: 36,
    marginLeft: 10,
  },
  score: {
    minWidth: 80, // Supaya ukuran tetap, tidak berubah
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'right', // Supaya skor sejajar kanan
  },
  trophyContainer: {
    width: 30, // Supaya icon tetap sejajar
    alignItems: 'center',
  },
  addFriendButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 10,
    backgroundColor: '#f8f9fa', // Added light background for button
  },
  emptyText: { 
    fontSize: 18, 
    textAlign: 'center', 
    marginTop: 20, 
    color: 'white' 
  },
  chooseCategoryText: { 
    fontSize: 16, 
    textAlign: 'center', 
    marginTop: 20, 
    color: 'white' 
  },
});

export default LeaderboardScreen;