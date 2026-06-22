import type { CameraPreset } from '@/components/render3d/types';

interface CameraPresetControlsProps {
  activePreset: CameraPreset;
  onPresetChange: (preset: CameraPreset) => void;
}

const presets: { label: string; value: CameraPreset }[] = [
  { label: 'Iso', value: 'isometric' },
  { label: 'Top', value: 'top' },
  { label: 'Side', value: 'side' },
  { label: 'Front', value: 'front' },
];

export function CameraPresetControls({ activePreset, onPresetChange }: CameraPresetControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <button
          key={preset.value}
          type="button"
          onClick={() => onPresetChange(preset.value)}
          className={`rounded-md border px-3 py-2 text-sm font-medium ${
            activePreset === preset.value
              ? 'border-brand-600 bg-brand-50 text-brand-700'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
