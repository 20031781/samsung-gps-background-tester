import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { initDb } from './src/services/db';
import { HomeScreen } from './src/screens/HomeScreen';
import { SessionsScreen } from './src/screens/SessionsScreen';
import { SetupScreen } from './src/screens/SetupScreen';

initDb();

const Stack = createNativeStackNavigator();

export default function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Setup" component={SetupScreen} />
        <Stack.Screen name="Sessions/Export" component={SessionsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
