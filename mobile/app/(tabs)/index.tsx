import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export default function MeetingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Meetings</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.bg },
  text: { color: Colors.dark.text },
});
