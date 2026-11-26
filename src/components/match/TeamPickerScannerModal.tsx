import { CameraView } from 'expo-camera';
import X from 'lucide-react-native/icons/x';
import { Modal, Pressable, Text, View } from 'react-native';

interface TeamPickerScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (event: { data: string }) => void;
}

/**
 * Full-screen QR code scanner modal used by TeamPicker to resolve any team by code.
 */
export function TeamPickerScannerModal({
  visible,
  onClose,
  onScanned,
}: TeamPickerScannerModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={visible ? onScanned : undefined}
        />
        <Pressable
          onPress={onClose}
          accessibilityLabel="Cancel scanning"
          accessibilityHint="Closes the camera without scanning"
          className="absolute left-6 top-14 items-center justify-center rounded-full bg-black/50"
          style={{ width: 40, height: 40 }}
        >
          <X color="#ffffff" size={22} />
        </Pressable>
        <Text className="absolute bottom-16 w-full text-center text-sm font-bold text-white">
          Point the camera at a team&apos;s QR code
        </Text>
      </View>
    </Modal>
  );
}
