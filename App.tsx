import React from 'react';

import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';


import LoginScreen from './components/LoginScreen';
import AccountScreen from './components/AccountScreen';
import ChangeNameScreen from './components/ChangeNameScreen';
import ChangePasswordScreen from './components/ChangePasswordScreen';
import RegisterScreen from './components/RegisterScreen';
// Import Screens
import HomeScreen from './components/HomeScreen';
import QuizScreen from './components/QuizScreen';
import ResultScreen from './components/ResultScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import FriendsScreen from './components/FriendsScreen';
import EditProfileScreen from './components/EditProfileScreen';

const Tab = createBottomTabNavigator();
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // Tambahkan ini untuk menghilangkan topbar di tab navigator
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Leaderboard') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Friends') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Akun') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'gold',
        tabBarInactiveTintColor: 'white',
        tabBarStyle: {
          backgroundColor: 'black',
         
   
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Akun" component={AccountScreen} />
    </Tab.Navigator>
  );
};

const Stack = createStackNavigator();
const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen}  />
        <Stack.Screen name="Register" component={RegisterScreen}  />
        <Stack.Screen name="Main" component={TabNavigator}  />
        <Stack.Screen name="Quiz" component={QuizScreen}  />
        <Stack.Screen name="Result" component={ResultScreen}  />
        <Stack.Screen name="ChangeName" component={ChangeNameScreen}  />
<Stack.Screen name="ChangePassword" component={ChangePasswordScreen}  />
<Stack.Screen name="EditProfile" component={EditProfileScreen}  />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
