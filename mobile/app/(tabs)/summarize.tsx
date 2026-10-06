import { View } from 'react-native';
import { RecordUploadView } from '@/components/RecordUploadView';
import { TranscriptPicker } from '@/components/TranscriptPicker';
import { useTheme } from '@/contexts/ThemeContext';
import { TAB_BAR_OFFSET } from '@/constants/tokens';

// RecordUploadView owns a full-height ScrollView, so the picker sits below it in
// normal flow (collapsed by default) rather than inside the same scroll.
export default function SummarizeScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <RecordUploadView mode="summary" />
      </View>
      <View style={{ paddingBottom: TAB_BAR_OFFSET }}>
        <TranscriptPicker />
      </View>
    </View>
  );
}
