import React from 'react';
import { TileRecognitionScreen } from './TileRecognitionScreen';

interface Props {
  onBack: () => void;
}

export function ManualInputScreen({ onBack }: Props) {
  return <TileRecognitionScreen onBack={onBack} mode="manual" />;
}
