import {
  deckFinishLabels,
  type DeckFinish,
  type DockRenderSettings,
} from '@/components/render3d/types';

interface RenderControlPanelProps {
  settings: DockRenderSettings;
  onSettingsChange: (settings: DockRenderSettings) => void;
  onExportPng: () => void;
}

const deckFinishOptions: DeckFinish[] = ['pressure-treated', 'composite-grey', 'composite-brown'];

function clampNumericValue(value: string, fallback: number, minimum: number): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? Math.max(minimum, parsedValue) : fallback;
}

export function RenderControlPanel({ settings, onSettingsChange, onExportPng }: RenderControlPanelProps) {
  const updateSetting = <Key extends keyof DockRenderSettings>(key: Key, value: DockRenderSettings[Key]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <aside className="max-h-[38vh] w-full shrink-0 overflow-y-auto border-t border-slate-200 bg-white p-4 lg:h-full lg:max-h-none lg:w-[18rem] lg:max-w-[32vw] lg:border-l lg:border-t-0 xl:w-80">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Render Controls</h2>
          <p className="text-sm text-slate-500">Floating dock proof of concept</p>
        </div>
        <button
          type="button"
          onClick={onExportPng}
          className="min-h-11 shrink-0 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Export PNG
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="block text-sm text-slate-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Dock length ft</span>
          <input
            type="number"
            min={4}
            step={1}
            value={settings.dockLength}
            onChange={(event) => updateSetting('dockLength', clampNumericValue(event.target.value, 24, 4))}
            className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm text-slate-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Dock width ft</span>
          <input
            type="number"
            min={2}
            step={1}
            value={settings.dockWidth}
            onChange={(event) => updateSetting('dockWidth', clampNumericValue(event.target.value, 8, 2))}
            className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm text-slate-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Dock height</span>
          <input
            type="number"
            min={0.25}
            step={0.25}
            value={settings.dockHeight}
            onChange={(event) => updateSetting('dockHeight', clampNumericValue(event.target.value, 1, 0.25))}
            className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
          <span>Ramp enabled</span>
          <input
            type="checkbox"
            checked={settings.rampEnabled}
            onChange={(event) => updateSetting('rampEnabled', event.target.checked)}
            className="h-6 w-6 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-slate-700">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Ramp length ft</span>
            <input
              type="number"
              min={4}
              step={1}
              value={settings.rampLength}
              onChange={(event) => updateSetting('rampLength', clampNumericValue(event.target.value, 12, 4))}
              disabled={!settings.rampEnabled}
              className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
            />
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Ramp width ft</span>
            <input
              type="number"
              min={2}
              step={1}
              value={settings.rampWidth}
              onChange={(event) => updateSetting('rampWidth', clampNumericValue(event.target.value, 4, 2))}
              disabled={!settings.rampEnabled}
              className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
            />
          </label>
        </div>

        <label className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
          <span>Railings enabled</span>
          <input
            type="checkbox"
            checked={settings.railingsEnabled}
            onChange={(event) => updateSetting('railingsEnabled', event.target.checked)}
            className="h-6 w-6 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
          />
        </label>

        <label className="block text-sm text-slate-700">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Deck finish</span>
          <select
            value={settings.deckFinish}
            onChange={(event) => updateSetting('deckFinish', event.target.value as DeckFinish)}
            className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {deckFinishOptions.map((finish) => (
              <option key={finish} value={finish}>
                {deckFinishLabels[finish]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </aside>
  );
}
