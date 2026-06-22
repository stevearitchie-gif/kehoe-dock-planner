import { DockDeck } from '@/components/render3d/DockDeck';
import { DockFloats } from '@/components/render3d/DockFloats';
import { DockRailings } from '@/components/render3d/DockRailings';
import { DockRamp } from '@/components/render3d/DockRamp';
import type { DockRenderSettings } from '@/components/render3d/types';

interface FloatingDockModelProps {
  settings: DockRenderSettings;
}

export function FloatingDockModel({ settings }: FloatingDockModelProps) {
  return (
    <group>
      <DockFloats dockLength={settings.dockLength} dockWidth={settings.dockWidth} />
      <DockDeck
        length={settings.dockLength}
        width={settings.dockWidth}
        height={settings.dockHeight}
        finish={settings.deckFinish}
      />
      {settings.rampEnabled && (
        <DockRamp
          dockLength={settings.dockLength}
          dockHeight={settings.dockHeight}
          rampLength={settings.rampLength}
          rampWidth={settings.rampWidth}
          finish={settings.deckFinish}
        />
      )}
      {settings.railingsEnabled && (
        <DockRailings
          dockLength={settings.dockLength}
          dockWidth={settings.dockWidth}
          dockHeight={settings.dockHeight}
        />
      )}
    </group>
  );
}
