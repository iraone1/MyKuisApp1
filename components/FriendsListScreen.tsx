import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

const DEFAULT_PROFILE_PIC = 'https://via.placeholder.com/60';
const { width } = Dimensions.get('window');
const COLUMN_NUM = 3;
const ITEM_WIDTH = (width - 40) / COLUMN_NUM; // 40 is total horizontal padding and margins

const FriendsListScreen = () => {
  const [acceptedFriends, setAcceptedFriends] = useState([]);
  const [userId, setUserId] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribeAuth = auth().onAuthStateChanged(user => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setAcceptedFriends([]);
      }
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Reference to friends list
    const friendsRef = database().ref(`/friends/${userId}`);
    
    // Define listeners outside of the on() call so we can reference them in cleanup
    const friendsListener = (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const friendList = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
        }));

        const accepted = friendList.filter(friend => friend.status === 'accepted');
        
        // Fetch the latest data for each friend from the users table
        const friendPromises = accepted.map(friend => {
          return database()
            .ref(`/users/${friend.id}`)
            .once('value')
            .then(userSnapshot => {
              if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                return {
                  ...friend,
                  // Always use the most current name from users table
                  name: userData.name || friend.name || 'Unknown User',
                  // Always use the most current profile image from users table
                  profileImage: userData.profileImage || userData.profilePic || friend.profileImage || DEFAULT_PROFILE_PIC
                };
              }
              return friend;
            });
        });

        Promise.all(friendPromises)
          .then(updatedFriends => {
            setAcceptedFriends(updatedFriends);
          })
          .catch(error => {
            console.error("Error fetching friend details:", error);
          });
      } else {
        setAcceptedFriends([]);
      }
    };

    // Attach the listeners
    friendsRef.on('value', friendsListener);

    // Cleanup function with properly defined listeners
    return () => {
      friendsRef.off('value', friendsListener);
    };
  }, [userId]);

  // Render accepted friends in a grid with columns like Instagram
  const renderAcceptedFriend = ({ item }) => (
    <TouchableOpacity style={styles.friendCard}>
      <View style={styles.igProfileContainer}>
        <Image 
          source={{ uri: item.profileImage || item.profilePic || DEFAULT_PROFILE_PIC }} 
          style={styles.igProfilePic} 
        />
        <View style={styles.igNameContainer}>
          <Text style={styles.igUsername} numberOfLines={1}>{item.name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
   

      {/* Teman yang Sudah Berteman */}
   
      {acceptedFriends.length > 0 ? (
        <FlatList
        nestedScrollEnabled={true}
          data={acceptedFriends}
          numColumns={COLUMN_NUM}
          keyExtractor={(item) => item.id}
          renderItem={renderAcceptedFriend}
          columnWrapperStyle={styles.columnWrapper}
        //   contentContainerStyle={styles.friendsGridContainer}
        //   style={styles.acceptedFriendsList}
          scrollEnabled={false} // Disable scroll in this FlatList
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Belum ada teman</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
  marginHorizontal:10,
  borderRadius:15,
  borderColor: '#fed800',
  borderWidth:2.5,  
    backgroundColor: 'black' // Instagram menggunakan latar belakang light gray
  },
  contentContainer: {
  
    flexGrow: 1,
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 16, 
    textAlign: 'center',
    color: '#262626' // Instagram dark text color
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 10, 
    color: '#262626',
    
  },
  // Accepted friends section
  acceptedFriendsList: {
    marginBottom: 20, // Extra margin below the friends list
  },
  friendsGridContainer: {
    paddingVertical: 8
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    marginVertical: 10
  }, 
  friendCard: {
    width: ITEM_WIDTH-45,
  },
  igProfileContainer: {
    alignItems: 'center',
  },
  igProfilePic: { 
    width: 60, 
    height: 60, 
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: '#dfc710', // Instagram light gray border
  },
  igNameContainer: {
    marginTop: 0.5,
    width: ITEM_WIDTH -70, // Leave a bit of padding
  },
  igUsername: { 
    fontSize: 14, 
    textAlign:'center',
    color: 'white',
    fontWeight: '400'
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
    color: '#8e8e8e', // Instagram medium gray
    marginTop: 10 
  },
});

export default FriendsListScreen;