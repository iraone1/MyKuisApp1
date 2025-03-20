import React, { Component } from 'react'
import { Text, View,ActivityIndicator, ImageBackground } from 'react-native'

export class Loading extends Component {
  render() {
    return (
      <ImageBackground source={require('../assets/istockphoto-185007737-612x612.jpg')}style={{flex: 1,
    resizeMode: 'cover',}}>
     <View style={{alignItems:'center',flex:1,justifyContent:'center',backgroundColor: 'rgba(0, 0, 0, 0.3)'}}>
        <ActivityIndicator size="large" color="#dcc91f"  />
        <Text style={{textAlign:'center',fontSize:30,fontWeight:'bold',color:'white'}}> Tunggu Rek!!! Masih loading</Text>
    </View>
    </ImageBackground>
    )
  }
}

export default Loading
