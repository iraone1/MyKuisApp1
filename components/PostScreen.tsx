import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, Image, TouchableOpacity, FlatList, ActivityIndicator, Alert, StyleSheet, SafeAreaView, Modal, RefreshControl
} from 'react-native';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Share from 'react-native-share';
import axios from 'axios';
import Video from 'react-native-video'; 


// Modified to work as a standalone rendering component without navigation dependencies
const PostScreen = () => {
  
  const [postText, setPostText] = useState('');
  const [media, setMedia] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userProfiles, setUserProfiles] = useState({});
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [currentPostId, setCurrentPostId] = useState(null);
  const [currentPostUserId, setCurrentPostUserId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [currentPost, setCurrentPost] = useState(null);
  // Add states for video playback
  const [videoMuted, setVideoMuted] = useState(true); // Default to muted
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [currentPlayingVideo, setCurrentPlayingVideo] = useState(null);
  const videoRefs = useRef({});
  
  const userId = auth().currentUser?.uid;

  // Cloudinary configuration - replace with your actual cloud name, upload preset, and API key
  const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dzwdwkiw0/image/upload';
  const CLOUDINARY_UPLOAD_PRESET = 'ml_default'; // Create an unsigned upload preset in Cloudinary dashboard
  const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 5MB in bytes

  useEffect(() => {
    if (!userId) {
      Alert.alert('Error', 'Please log in to continue');
      // Removed navigation code
    }
  }, [userId]);

  // Fetch current user profile
  useEffect(() => {
    if (userId) {
      const userRef = database().ref(`/users/${userId}`);
      
      // Set up real-time listener for current user profile
      userRef.on('value', snapshot => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setCurrentUserProfile(userData);
          
          // Update userProfiles with current user data as well
          setUserProfiles(prevProfiles => ({
            ...prevProfiles,
            [userId]: userData
          }));
        } else {
          console.log('No user data found for current user');
        }
      });
      
      return () => userRef.off('value');
    }
  }, [userId]);

  // Function to completely refresh the data
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await fetchFriends();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch friends and their posts
  const fetchFriends = async () => {
    setLoading(true);
    try {
      // Reference to the current user's friends list
      const friendsRef = database().ref(`/friends/${userId}`);
      const snapshot = await friendsRef.once('value');
      
      let friendList = [];
      if (snapshot.exists()) {
        const friendsData = snapshot.val();
        
        // Based on the database structure, the data format is:
        // { friendId: { name: "xxx", profileImage: "xxx", status: "accepted" } }
        Object.entries(friendsData).forEach(([friendId, data]) => {
          // Only add friends with "accepted" status
          if (data && data.status === "accepted") {
            friendList.push(friendId);
            console.log(`Friend found: ${friendId} with name ${data.name}`);
          }
        });
      }
      
      console.log('Total friends fetched:', friendList.length);
      console.log('Friend IDs:', friendList);
      setFriends(friendList);
      
      // Always include yourself in the viewable posts
      const userIdsToFetch = [...new Set([...friendList, userId])];
      
      console.log('User IDs to fetch posts from:', userIdsToFetch);
      
      // Fetch profile information for all friends and yourself
      await fetchUserProfiles(userIdsToFetch);
      
      // Fetch posts from friends and yourself
      await fetchPosts(userIdsToFetch);
      
    } catch (error) {
      console.error('Error fetching friends:', error);
      Alert.alert('Error', 'Failed to load friends list');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user profiles for friends and self
  const fetchUserProfiles = async (userIds) => {
    try {
      // Clear existing listeners first
      for (const uid of Object.keys(userProfiles)) {
        database().ref(`/users/${uid}`).off('value');
      }
      
      // Set up new listeners for each user profile
      userIds.forEach(uid => {
        const userRef = database().ref(`/users/${uid}`);
        
        userRef.on('value', snapshot => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            
            // Update the profiles object with this user's data
            setUserProfiles(prevProfiles => ({
              ...prevProfiles,
              [uid]: userData
            }));
          }
        });
      });
    } catch (error) {
      console.error('Error setting up profile listeners:', error);
    }
  };

  const debugFriendsStructure = async () => {
    try {
      const friendsRef = database().ref(`/friends/${userId}`);
      const snapshot = await friendsRef.once('value');
      
      if (snapshot.exists()) {
        console.log('Friends data structure:', JSON.stringify(snapshot.val(), null, 2));
      } else {
        console.log('No friend data found');
      }
    } catch (error) {
      console.error('Error debugging friends:', error);
    }
  };

  // Add debug method to component
  useEffect(() => {
    if (userId) {
      // Call debug function when component mounts
      debugFriendsStructure();
    }
  }, [userId]);
  
  const fetchPosts = async (userIdsToFetch) => {
    try {
      database().ref('/posts').off('value');
      if (userIdsToFetch.length === 0) {
        console.log('No users to fetch posts from');
        setPosts([]);
        setLoading(false);
        return;
      }
      console.log('Fetching posts for users:', userIdsToFetch);
      const postsRef = database().ref('/posts');
      postsRef.on('value', snapshot => {
        if (snapshot.exists()) {
          const allPosts = snapshot.val();
          console.log("All posts received, filtering for friends");
          let friendPosts = [];
          Object.keys(allPosts).forEach(postUserId => {
            if (userIdsToFetch.includes(postUserId)) {
              console.log(`Processing posts from user ${postUserId}`);
              const userPostsObj = allPosts[postUserId];
              Object.keys(userPostsObj).forEach(postId => {
                const postData = userPostsObj[postId];
                friendPosts.push({
                  ...postData,
                  id: postId,
                  userId: postUserId
                });
              });
              
              console.log(`Found ${Object.keys(userPostsObj).length} posts from user ${postUserId}`);
            }
          });
          
          console.log(`Total ${friendPosts.length} posts from friends and self`);
          friendPosts.sort((a, b) => b.timestamp - a.timestamp);
          setPosts(friendPosts);
        } else {
          console.log("No posts found in database");
          setPosts([]);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts');
      setLoading(false);
    }
  };
  useEffect(() => {
    if (userId) {
      fetchFriends();
    }
    return () => {
      database().ref('/posts').off('value');
      if (userId) {
        database().ref(`/friends/${userId}`).off('value');
      }
      Object.keys(userProfiles).forEach(uid => {
        database().ref(`/users/${uid}`).off('value');
      });
      if (userId) {
        database().ref(`/users/${userId}`).off('value');
      }
    };
  }, [userId]);

  // Pause all videos except the one currently being played


  // Modified to check file size for videos
 const pickMedia = async () => {
    const options = {
      mediaType: 'mixed',
      quality: 0.8,
      maxWidth: 1200,
      maxHeight: 1200,
    };
    try {
      const response = await launchImageLibrary(options);
      if (!response.didCancel && !response.error) {
        const selected = response.assets[0];
        
        // Check if it's a video and verify size
        if (selected.type && selected.type.startsWith('video/')) {
          if (selected.fileSize > MAX_VIDEO_SIZE) {
            Alert.alert(
              'Video too large', 
              'Videos must be less than 5MB. Please select a smaller video or compress this one.'
            );
            return;
          }
        }
        
        setMedia(selected);
      }
    } catch (error) {
      console.error('Media picker error:', error);
      Alert.alert('Error', 'Failed to select media');
    }
  };


  const removeMedia = () => {
    setMedia(null);
  };

  // Convert file to base64 for Cloudinary upload


  // Upload media to Cloudinary instead of Firebase storage
  const uploadToCloudinary = async (mediaFile) => {
  try {
    setUploadProgress(10); // Start progress
    
    // For videos, we need to use a different approach than base64
    const isVideo = mediaFile.type.startsWith('video/');
    
    // Create form data for the upload
    const formData = new FormData();
    
    if (isVideo) {
      // For videos, we need to append the file directly
      // Create a file object with the correct name and type
      const videoFile = {
        uri: mediaFile.uri,
        type: mediaFile.type,
        name: mediaFile.fileName || `video_${Date.now()}.${mediaFile.type.split('/')[1]}`
      };
      
      formData.append('file', videoFile);
      formData.append('resource_type', 'video');
    } else {
      // For images, we can use base64 or direct file upload
      const imageFile = {
        uri: mediaFile.uri,
        type: mediaFile.type,
        name: mediaFile.fileName || `image_${Date.now()}.${mediaFile.type.split('/')[1]}`
      };
      
      formData.append('file', imageFile);
    }
    
    // Add the upload preset for unsigned uploads
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    setUploadProgress(30); // Update progress
    
    // Configure the correct URL based on resource type
    const uploadUrl = isVideo 
      ? `https://api.cloudinary.com/v1_1/dzwdwkiw0/video/upload`
      : `https://api.cloudinary.com/v1_1/dzwdwkiw0/image/upload`;
    
    console.log(`Uploading to Cloudinary as ${isVideo ? 'video' : 'image'}`);
    
    // Upload to Cloudinary with progress tracking
    const response = await axios.post(uploadUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 70 / progressEvent.total) + 30
        );
        setUploadProgress(progress);
      }
    });
    
    console.log('Cloudinary upload response:', response.data);
    setUploadProgress(100); // Complete progress
    
    // Return the Cloudinary URL and resource type
    return {
      url: response.data.secure_url,
      resourceType: isVideo ? 'video' : 'image',
      publicId: response.data.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error.response ? error.response.data : error.message);
    throw new Error(error.response ? 
      `Cloudinary upload failed: ${JSON.stringify(error.response.data)}` : 
      `Upload error: ${error.message}`);
  }
};

  // Modified to use Cloudinary instead of Firebase storage
 const uploadPost = async () => {
  if (!postText.trim() && !media) {
    Alert.alert('Post Failed', 'Please add text or media to your post.');
    return;
  }
  
  setUploading(true);
  setUploadProgress(0);
  let mediaData = null;
  
  try {
    if (media) {
      console.log('Preparing to upload media:', media.type);
      // Upload to Cloudinary and get the URL
      mediaData = await uploadToCloudinary(media);
      console.log('Media uploaded successfully:', mediaData);
    }
    
    // Create post in Firebase database
    const newPostRef = database().ref(`/posts/${userId}`).push();
    await newPostRef.set({
      id: newPostRef.key,
      userId,
      text: postText,
      mediaUrl: mediaData ? mediaData.url : null,
      timestamp: Date.now(),
      mediaType: media?.type || null,
      cloudinaryPublicId: mediaData ? mediaData.publicId : null,
      cloudinaryResourceType: mediaData ? mediaData.resourceType : null,
      likes: {},
      comments: {}
    });
    
    setPostText('');
    setMedia(null);
    setUploading(false);
    setUploadProgress(0);
    await refreshData();
    Alert.alert('Success', 'Your post has been published!');
  } catch (error) {
    console.error('Upload error:', error);
    setUploading(false);
    setUploadProgress(0);
    Alert.alert('Error', 'Failed to upload media: ' + error.message);
  }
};
 const ListHeaderComponent = () => (
    <>
      <View style={styles.postContainer}>
        <Text style={styles.headerTitle}>Postingan</Text>
        <View style={styles.userInfo}>
          {renderUserAvatar(userId)}
          <Text style={styles.username}>{getUserDisplayName(userId)}</Text>
        </View>
        <TextInput style={styles.textInput}
          placeholder="What's on your mind?"
          placeholderTextColor="white"
          value={postText}
          onChangeText={setPostText}
          multiline
          numberOfLines={4}
        />
        {media && (
          <View style={styles.mediaPreviewContainer}>
            <Image
              source={{ uri: media.uri }}
              style={styles.mediaPreview}
              resizeMode="cover"
            />
            <TouchableOpacity style={styles.removeMediaButton} onPress={removeMedia}>
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.postActions}>
          <TouchableOpacity onPress={pickMedia} style={styles.mediaButton}>
            <Ionicons name="images-outline" size={24} color="#4CAF50" />
            <Text style={styles.mediaButtonText}>Photo/Video</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.postButton, 
              (!postText.trim() && !media) && styles.postButtonDisabled
            ]}
            onPress={uploadPost} 
            disabled={uploading || (!postText.trim() && !media)}
          >
            <Text style={styles.postButtonText}>Post</Text>
          </TouchableOpacity>
        </View>
        {uploading && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={styles.uploadingText}>
              Uploading... {uploadProgress.toFixed(0)}%
            </Text>
          </View>
        )}
      </View>
      <View style={styles.feedContainer}>
        {friends.length > 0 && (
          <Text style={styles.friendsInfoText}>
            Showing posts from you and {friends.length} friend{friends.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </>
  );

  const handleLike = async (postId, postUserId) => {
    try {
      const likeRef = database().ref(`/posts/${postUserId}/${postId}/likes/${userId}`);
      const snapshot = await likeRef.once('value');  
      if (snapshot.exists()) {
        await likeRef.remove();
      } else {
        await likeRef.set(true);
      }
    } catch (error) {
      console.error('Like error:', error);
      Alert.alert('Error', 'Failed to like/unlike post');
    }
  };
 const didUserLike = (post) => {
    return post && post.likes && post.likes[userId];
  };
  const countLikes = (post) => {
    if (!post || !post.likes) return 0;
    return Object.keys(post.likes).length;
  };
  const countComments = (post) => {
    if (!post || !post.comments) return 0;
    return Object.keys(post.comments).length;
  };
  const formatTimestampYouTubeStyle = (timestamp) => {
    if (!timestamp) return '';    
    const now = new Date();
    const commentTime = new Date(timestamp);
    const diffTime = Math.abs(now - commentTime);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    if (diffMinutes < 60) {
      return diffMinutes === 0 ? 'Just now' : `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? 'year' : 'years'} ago`;
    }
  };
  const openCommentModal = async (postId, postUserId) => {
    const foundPost = posts.find(p => p.id === postId && p.userId === postUserId);
    if (!foundPost) {
      console.error('Post not found:', postId, postUserId);
      Alert.alert('Error', 'Could not find the post');
      return;
    }
    setCurrentPostId(postId);
    setCurrentPostUserId(postUserId);
    setCurrentPost(foundPost);
    setCommentText('');
    setCommentModalVisible(true);
    await fetchComments(postId, postUserId);
  };
  const fetchComments = async (postId, postUserId) => {
    setLoadingComments(true);
    try {
      const commentsRef = database().ref(`/posts/${postUserId}/${postId}/comments`);
      const snapshot = await commentsRef.once('value');
      if (snapshot.exists()) {
        const commentsData = snapshot.val();
        const commentsArray = Object.keys(commentsData).map(key => ({
          id: key,
          ...commentsData[key]
        }));
        commentsArray.sort((a, b) => b.timestamp - a.timestamp);
        setComments(commentsArray);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  };
  const postComment = async () => {
    if (!commentText.trim() || !currentPostId || !currentPostUserId) {
      return;
    }
    try {
      const commentRef = database().ref(`/posts/${currentPostUserId}/${currentPostId}/comments`).push();
      await commentRef.set({
        userId,
        text: commentText,
        timestamp: Date.now()
      });
      setCommentText('');
      await fetchComments(currentPostId, currentPostUserId);
    } catch (error) {
      console.error('Comment error:', error);
      Alert.alert('Error', 'Failed to post comment');
    }
  };
  const sharePost = async (post) => {
    if (!post) return;
    try {
      const shareOptions = {
        message: post.text || 'Check out this post!',
        url: post.mediaUrl || undefined,
        title: 'Share Post'
      };
      await Share.open(shareOptions);
    } catch (error) {
      console.error('Share error:', error);
      if (error.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share post');
      }
    }
  };
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  const renderUserAvatar = (userId) => {
    if (!userId) return null;
    const profile = userProfiles[userId];
    if (profile && profile.profileImage) {
      return (
        <Image 
          source={{ uri: profile.profileImage }} 
          style={styles.avatar} 
          resizeMode="cover"
        />
      );
    } else {
      return (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {getUserInitials(userId)}
          </Text>
        </View>
      );
    }
  };
  const getUserInitials = (userId) => {
    if (!userId) return '';
    const profile = userProfiles[userId];
    if (profile) {
      if (profile.fullName) {
        const nameParts = profile.fullName.split(' ');
        if (nameParts.length > 1) {
          return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else {
          return (nameParts[0][0] + (nameParts[0][1] || '')).toUpperCase();
        }
      } 
      else if (profile.name) {
        const nameParts = profile.name.split(' ');
        if (nameParts.length > 1) {
          return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else {
          return (nameParts[0][0] + (nameParts[0][1] || '')).toUpperCase();
        }
      }
    }
    return userId.substring(0, 2).toUpperCase();
  };
  const getUserDisplayName = (userId) => {
    if (!userId) return 'Unknown User';
    const profile = userProfiles[userId];
    if (profile) {
      if (profile.name) return profile.name;
      if (profile.username) return profile.username;
      if (profile.fullName) return profile.fullName;
    }
    return userId === auth().currentUser?.uid ? 'You' : `User ${userId.substring(0, 5)}`;
  };

  // Function to toggle video mute
const toggleVideoMute = () => {
  const newMuteState = !videoMuted;
  setVideoMuted(newMuteState);
  
  // Apply the mute state to the currently playing video
  if (currentPlayingVideo && videoRefs.current[currentPlayingVideo]) {
    try {
      if (typeof videoRefs.current[currentPlayingVideo].setNativeProps === 'function') {
        videoRefs.current[currentPlayingVideo].setNativeProps({ muted: newMuteState });
      } else {
        console.log(`Video ref for ${currentPlayingVideo} doesn't have setNativeProps method`);
      }
    } catch (err) {
      console.error(`Error toggling mute: ${err.message}`);
    }
  }
}

  // Function to toggle fullscreen mode for video
 
  // Function to handle video error
  const handleVideoError = (error) => {
    console.error('Video playback error:', error);
  };
const handleViewableItemsChanged = useRef(({ viewableItems, changed }) => {
  // Find any video posts that are now visible
  const visibleVideoPosts = viewableItems.filter(item => 
    item.item.mediaType && item.item.mediaType.startsWith('video/')
  );
  
  // Find any video posts that were visible but are now not visible
  const nonVisibleVideos = changed.filter(item => 
    !item.isViewable && 
    item.item.mediaType && 
    item.item.mediaType.startsWith('video/')
  );
  
  // Pause any videos that are no longer visible
  nonVisibleVideos.forEach(item => {
    const videoPostId = `${item.item.userId}-${item.item.id}`;
    if (videoRefs.current[videoPostId]) {
      try {
        videoRefs.current[videoPostId].setNativeProps({ paused: true });
        // If this was the currently playing video, reset the current playing video
        if (currentPlayingVideo === videoPostId) {
          setCurrentPlayingVideo(null);
        }
      } catch (err) {
        console.error(`Error pausing video: ${err.message}`);
      }
    }
  });
  
  // Remove auto-play behavior for the first visible video
  // No longer automatically calling handleVideoPlay here
}).current;

const viewabilityConfig = useRef({
  itemVisiblePercentThreshold: 500,
  minimumViewTime: 30
}).current;
  // Render video component with controls
const renderVideoContent = (post) => {
  const postId = `${post.userId}-${post.id}`;
  
  return (
    <View style={styles.videoWrapper}>
      <Video
        ref={ref => {
          if (ref) {
            videoRefs.current[postId] = ref;
            console.log(`Video ref set for ${postId}`);
          }
        }}
        source={{ uri: post.mediaUrl }}
        style={styles.postVideo}
        resizeMode="contain"
        controls={true}
        paused={true} // Always start paused - no autoplay
        muted={videoMuted}
        repeat={true}
        onError={handleVideoError}
        onLoad={() => {
          console.log('Video loaded:', postId);
          // Don't trigger play on load anymore
        }}
        onBuffer={({isBuffering}) => 
          console.log('Video buffering:', isBuffering)}
        // Remove automatic playing when state changes
        onPlaybackStateChanged={({isPlaying}) => {
          if (isPlaying) {
            setCurrentPlayingVideo(postId);
          }
        }}
      />
      
      {/* Add a mute/unmute button overlay */}
      <View style={styles.videoControlsOverlay}>
        <TouchableOpacity 
          style={styles.videoControlButton} 
          onPress={toggleVideoMute}
        >
          <Ionicons 
            name={videoMuted ? "volume-mute" : "volume-medium"} 
            size={22} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

  return (
<SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      ) : (
        <FlatList
        nestedScrollEnabled={true}
          data={posts}
          keyExtractor={(item) => `${item.userId}-${item.id}`}
          ListHeaderComponent={ListHeaderComponent}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshData}
              colors={['#2196F3']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={48} color="#BDBDBD" />
              <Text style={styles.emptyText}>No posts yet</Text>
              <Text style={styles.emptySubtext}>
                {friends.length > 0 
                  ? 'Posts from you and your friends will appear here'
                  : 'Add friends to see their posts here'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.postContainer}>
              <View style={styles.postHeader}>
                {renderUserAvatar(item.userId)}
                <View>
                  <Text style={styles.postUsername}>
                    {getUserDisplayName(item.userId)}
                  </Text>
                  <Text style={styles.postTime}>{formatTimestamp(item.timestamp)}</Text>
                </View>
              </View>
              
              {item.text && (
                <Text style={styles.postText}>{item.text}</Text>
              )}
              
              {item.mediaUrl && (
                <View style={styles.postMediaContainer}>
                  {item.mediaType && item.mediaType.includes('image') ? (
                    <Image 
                      source={{ uri: item.mediaUrl }} 
                      style={styles.postMedia} 
                      resizeMode="cover" 
                    />
                  ) : (
                    renderVideoContent(item)
                  )}
                </View>
              )}
              <View style={styles.interactionStats}>
                {countLikes(item) > 0 && (
                  <View style={styles.statItem}>
                  </View>
                )}
                {countComments(item) > 0 && (
                  <TouchableOpacity 
                    style={styles.statItem}
                    onPress={() => openCommentModal(item.id, item.userId)}
                  >
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.postActions}>
                <TouchableOpacity 
                  style={[
                    styles.postAction,
                    didUserLike(item) && styles.likedAction
                  ]}
                  onPress={() => handleLike(item.id, item.userId)}
                >
                  <Ionicons 
                    name={didUserLike(item) ? "heart" : "heart-outline"} 
                    size={22} 
                    color={didUserLike(item) ? "#E91E63" : "#616161"} 
                  />
                  <Text 
                    style={[
                      styles.postActionText,
                      didUserLike(item) && styles.likedActionText
                    ]}
                  >
                    {countLikes(item) > 0 ? `${countLikes(item)} Like${countLikes(item) > 1 ? 's' : ''}` : 'Like'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.postAction}
                  onPress={() => openCommentModal(item.id, item.userId)}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#616161" />
                  <Text style={styles.postActionText}>
                    {countComments(item) > 0 ? `${countComments(item)} Comment${countComments(item) > 1 ? 's' : ''}` : 'Comment'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.postAction}
                  onPress={() => sharePost(item)}
                >
                  <Ionicons name="share-social-outline" size={20} color="#616161" />
                  <Text style={styles.postActionText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
      <Modal
        animationType="slide"
        transparent={true}
        visible={commentModalVisible}
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <View style={styles.commentCountContainer}>
                <Ionicons name="chatbubble-outline" size={16} color="#606060" />
                <Text style={styles.commentCount}>{countComments(currentPost)}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setCommentModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            <View style={styles.commentInputContainer}>
              {renderUserAvatar(userId)}
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity 
                style={[styles.commentButton, !commentText.trim() && styles.commentButtonDisabled]} 
                onPress={postComment}
                disabled={!commentText.trim()}
              >
                <Ionicons name="send" size={22} color={commentText.trim() ? "#065FD4" : "#BDBDBD"} />
              </TouchableOpacity>
            </View>
            {loadingComments ? (
              <ActivityIndicator style={styles.commentLoader} size="small" color="#065FD4" />
            ) : (
              <FlatList
            nestedScrollEnabled={true}
                data={comments}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.commentsList}
                ListEmptyComponent={
                  <View style={styles.noCommentsContainer}>
                    <Ionicons name="chatbubble-outline" size={36} color="#BDBDBD" />
                    <Text style={styles.noCommentsText}>No comments yet</Text>
                    <Text style={styles.noCommentsSubtext}>Be the first to comment on this post</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    {renderUserAvatar(item.userId)}
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentUsername}>{getUserDisplayName(item.userId)}</Text>
                        <Text style={styles.commentTime}>{formatTimestampYouTubeStyle(item.timestamp)}</Text>
                      </View>
                      <Text style={styles.commentText}>{item.text}</Text>
                      <View style={styles.commentActions}>
                        <TouchableOpacity style={styles.commentAction}>
                          <Ionicons name="thumbs-up-outline" size={16} color="#606060" />
                          <Text style={styles.commentActionText}>Like</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentAction}>
                          <Ionicons name="thumbs-down-outline" size={16} color="#606060" />
                          <Text style={styles.commentActionText}>Dislike</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentAction}>
                          <Text style={styles.replyButtonText}>REPLY</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#FFFFFF',
  },
   modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end', // Make modal slide from bottom like YouTube
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    height: '80%', // Take up most of the screen
    paddingBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  commentCount: {
    fontSize: 16,
    color: '#606060',
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 8,
    marginHorizontal: 10,
    fontSize: 15,
  },
  commentButton: {
    padding: 8,
  },
  commentButtonDisabled: {
    opacity: 0.5,
  },
  commentLoader: {
    marginVertical: 20,
  },
  commentsList: {
    paddingHorizontal: 16,
  },
  noCommentsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noCommentsText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#212121',
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: '#757575',
    marginTop: 5,
    textAlign: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    marginTop: 16,
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentUsername: {
    fontWeight: 'bold',
    fontSize: 13,
    marginRight: 6,
    color: 'white',
  },
  commentTime: {
    fontSize: 12,
    color: '#606060',
  },
  commentText: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 4,
    color: '#212121',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  commentAction: {
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#606060',
  },
  // Update avatar styles to match YouTube
  avatar: {
    width:45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 10,borderColor: '#fed800',borderWidth:1.5
    
   
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#065FD4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    
  },
  postContainer: {
     backgroundColor: 'black',
    padding: 10,
    marginBottom: 50,
    borderRadius:10,
    borderWidth:2.5,
    borderColor: '#fed800',

  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
    videoWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16/9,
    marginBottom: 10,
  },
  postVideo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  videoControlsOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    zIndex: 10,
  },
  videoControlButton: {
    padding: 8,
    marginLeft: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
  },
 
  
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  username: {
    fontWeight: 'bold',
    color:'white'
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#fed800',
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    color: '#FFFFFF',
    backgroundColor:'black'
  },
  mediaPreviewContainer: {
    marginTop: 10,
    position: 'relative',
  },
  mediaPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    borderRadius: 4,
    backgroundColor: '#F5F5F5',
  },
  mediaButtonText: {
    marginLeft: 5,
    color: '#4CAF50',
  },
  postButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  postButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  uploadingText: {
    marginLeft: 10,
    color: '#2196F3',
  },
  feedContainer: {
    flex: 1,
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  loader: {
    marginTop: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#757575',
    marginTop: 5,
  },
  friendsInfoText:{
    color: 'white',
    
    fontSize: 16,
    
    textAlign: 'center'
  },
  postItem: {
    backgroundColor: '#232222',
    borderRadius: 10,
    borderWidth:2.5,
    borderColor: '#4CAF50',
    
    marginBottom: 15,
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    
  },
  postUsername: {
    fontWeight: 'bold',
    fontSize:18,
    color: 'white'
  },
  postTime: {
    fontSize: 10,
    color: 'white',
  },
  postText: {
    marginBottom: 10,
    fontSize: 18,
    color: 'white',
  },
   fullscreenVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  postMediaContainer: {
    marginBottom: 10,
  },
  postMedia: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    
  },
  videoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 5,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  postActionText: {
    marginLeft: 5,
    color: '#616161',
  },
});

export default PostScreen;