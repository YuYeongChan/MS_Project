// auth/AuthGate.js
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from './authProvider';

export default function AuthGate({ children }) {
  const { bootstrapping } = useAuth();
  if (bootstrapping) {
    return (
      <View style={{ flex: 1, justifyContent:'center', alignItems:'center', backgroundColor:'#436D9D' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
  return children;
}
