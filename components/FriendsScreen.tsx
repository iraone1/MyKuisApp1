import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

const DEFAULT_PROFILE_PIC = 'https://via.placeholder.com/60';

const FriendRequestsScreen = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);  // Track sent requests
  const [userId, setUserId] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribeAuth = auth().onAuthStateChanged(user => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setPendingRequests([]);
        setSentRequests([]);
      }
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!userId) return;
  
    // Reference for friend requests
    const requestsRef = database().ref(`/friend_requests/${userId}`);
  
    // Reference for sent requests
    const sentRequestsRef = database().ref(`/friend_requests`);
  
    const requestsListener = (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const requestList = Object.keys(data).map(key => ({
          id: key,
          senderId: data[key].senderId,
          status: data[key].status
        }));
  
        // Fetch user details for each request
        const requestPromises = requestList.map(request => {
          return database()
            .ref(`/users/${request.senderId}`)
            .once('value')
            .then(userSnapshot => {
              if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                return {
                  ...request,
                  name: userData.name || 'Unknown User',
                  // Check for both profileImage and profilePic fields
                  profileImage: userData.profileImage || userData.profilePic || DEFAULT_PROFILE_PIC
                };
              }
              return request;
            });
        });
  
        Promise.all(requestPromises)
          .then(detailedRequests => {
            setPendingRequests(detailedRequests);
          })
          .catch(error => {
            console.error("Error fetching user details:", error);
          });
      } else {
        setPendingRequests([]);
      }
    };
  
    const sentRequestsListener = (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allSentRequests = [];
        
        // Look through all users' friend requests to find ones sent by current user
        Object.keys(data).forEach(recipientId => {
          const recipientRequests = data[recipientId];
          if (recipientRequests && recipientRequests[userId]) {
            allSentRequests.push({
              id: recipientId,
              ...recipientRequests[userId]
            });
          }
        });
        
        setSentRequests(allSentRequests);
      } else {
        setSentRequests([]);
      }
    };
  
    // Attach the listeners
    requestsRef.on('value', requestsListener);
    sentRequestsRef.on('value', sentRequestsListener);
  
    // Cleanup function with properly defined listeners
    return () => {
      requestsRef.off('value', requestsListener);
      sentRequestsRef.off('value', sentRequestsListener);
    };
  }, [userId]);

  useEffect(() => {
    navigation.setOptions({
      tabBarBadge: pendingRequests.length > 0 ? pendingRequests.length : null,
    });
  }, [pendingRequests, navigation]);

  const acceptFriendRequest = (requestItem) => {
    if (!userId) return;
  
    const friendId = requestItem.senderId;
    const friendName = requestItem.name;
    const friendProfileImage = requestItem.profileImage || DEFAULT_PROFILE_PIC;
    
    // First, get current user data
    database()
      .ref(`/users/${userId}`)
      .once('value')
      .then(snapshot => {
        const currentUserData = snapshot.val() || {};
        // Get the user's name directly from the database
        const currentUserName = currentUserData.name || 'Unknown User';
        // Get the profile image, checking both potential fields
        const currentUserProfileImage = currentUserData.profileImage || currentUserData.profilePic || DEFAULT_PROFILE_PIC;
        
        const updates = {};
        
        // Update friendship status for both users
        updates[`/friends/${userId}/${friendId}`] = {
          name: friendName,
          profileImage: friendProfileImage,
          status: 'accepted',
        };
        
        updates[`/friends/${friendId}/${userId}`] = {
          name: currentUserName,
          profileImage: currentUserProfileImage,
          status: 'accepted',
        };
  
        // Remove friend request after accepting
        updates[`/friend_requests/${userId}/${friendId}`] = null;
  
        return database()
          .ref()
          .update(updates);
      })
      .then(() => {
        Alert.alert("Berhasil", `${friendName} telah menjadi teman Anda!`);
        setPendingRequests(prevRequests => prevRequests.filter(req => req.senderId !== friendId));
      })
      .catch(error => Alert.alert("Gagal", `Gagal menerima pertemanan: ${error.message}`));
  };

  const rejectFriendRequest = (requestItem) => {
    if (!userId) return;

    const friendId = requestItem.senderId;
    const friendName = requestItem.name;

    database()
      .ref(`/friend_requests/${userId}/${friendId}`)
      .remove()
      .then(() => {
        Alert.alert("Permintaan Ditolak", `Anda telah menolak permintaan pertemanan dari ${friendName}.`);
        setPendingRequests(prevRequests => prevRequests.filter(req => req.senderId !== friendId));
      })
      .catch(error => Alert.alert("Gagal", `Gagal menolak pertemanan: ${error.message}`));
  };

  // Helper to check if user already has a pending request from another user
  const hasPendingRequestFrom = (otherUserId) => {
    return pendingRequests.some(req => req.senderId === otherUserId);
  };

  // Helper to check if user already sent a request to another user
  const hasSentRequestTo = (otherUserId) => {
    return sentRequests.some(req => req.recipientId === otherUserId);
  };

  // Function to send friend request (placeholder - not implemented in the original code)
  const sendFriendRequest = (otherUserId) => {
    // Check if there's already an incoming request from this user
    if (hasPendingRequestFrom(otherUserId)) {
      Alert.alert(
        "Permintaan Pertemanan Sudah Ada", 
        "Pengguna ini sudah mengirimi Anda permintaan pertemanan. Silakan terima atau tolak permintaan tersebut."
      );
      return;
    }
    
    if (hasSentRequestTo(otherUserId)) {
      Alert.alert(
        "Tidak Dapat Menambahkan", 
        "Anda sudah berteman atau sudah mengirim permintaan pertemanan ke pengguna ini."
      );
      return;
    }

    // Code for sending friend request would go here
    // Not implemented as it's not part of the issue to be fixed
  };

  // Render friend requests in rows
  const renderFriendRequest = ({ item }) => (
    <View style={styles.requestRow}>
      <View style={styles.userInfo}>
        <Image 
          source={{ uri: item.profileImage || DEFAULT_PROFILE_PIC }} 
          style={styles.profilePic} 
        />
        <Text style={styles.name}>{item.name}</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => acceptFriendRequest(item)}
        >
          <Text style={styles.addButtonText}>Terima</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.rejectButton} 
          onPress={() => rejectFriendRequest(item)}
        >
          <Text style={styles.rejectButtonText}>Tolak</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Permintaan Pertemanan</Text>

      {/* Permintaan Pertemanan */}
      {pendingRequests.length > 0 ? (
        <View style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>Permintaan Masuk {pendingRequests.length > 0 && `(${pendingRequests.length})`}</Text>
          <FlatList
          nestedScrollEnabled={true}
            data={pendingRequests}
            keyExtractor={(item) => item.id}
            renderItem={renderFriendRequest}
            style={styles.requestList}
            scrollEnabled={false} // Disable scroll in this FlatList
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Tidak ada permintaan pertemanan</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
     backgroundColor: '#2c2b2b'
  },
  contentContainer: {
    padding: 16,
    flexGrow: 1,
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 16, 
    textAlign: 'center',
    color: 'white' // Instagram dark text color
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginVertical: 12, 
    color: 'white',
    paddingHorizontal: 4
  },
  // Request section styles
  requestsSection: {
    paddingTop: 8,
  },
  requestList: {
    marginBottom: 16
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginVertical: 4,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    marginRight: 10,
    borderWidth: 3,
    borderColor: '#bde24e' // Instagram light gray border
  },
  name: { 
    fontSize: 16, 
    color: 'white',
    fontWeight: '400'
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  addButton: {
    backgroundColor: '#0095F6', // Instagram blue
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginLeft: 8,
  },
  addButtonText: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#fff',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#dbdbdb' // Instagram light gray border
  },
  rejectButtonText: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: '600',
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginBottom: 20,
  },
  emptyText: { 
    textAlign: 'center', 
    fontSize: 14, 
    color: 'white', // Instagram medium gray
    marginTop: 10 
  },
});

export default FriendRequestsScreen;