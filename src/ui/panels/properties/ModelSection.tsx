import React, { useCallback, useState } from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { CheckboxInput } from './inputs/CheckboxInput';
import { useCompositionStore } from '../../../state/compositionStore';
import type { Model3DData } from '../../../types/model3d';

interface Props {
  layer: any;
  compId: string;
}

export const ModelSection: React.FC<Props> = ({ layer, compId }) => {
  const data = layer.data as Model3DData;
  const [loading, setLoading] = useState(false);
  if (!data) return null;

  const upd = (patch: Partial<Model3DData>) =>
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, ...patch } } as any);

  const handleImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.gltf,.glb,.obj,.ply,.stl';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setLoading(true);
      try {
        const { loadModelFile } = await import('../../../renderer/layers/Model3DLoader');
        const modelData = await loadModelFile(file);
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'glb';
        const format = (ext === 'gltf' || ext === 'glb') ? ext as 'gltf' | 'glb'
          : (ext === 'obj') ? 'obj' as const
          : 'gltf' as const;

        // Store the asset via the renderer's Model3DLayerRenderer
        upd({
          assetId: modelData.url,
          url: modelData.url,
          format,
          scale: data.scale ?? 1,
        } as any);

        // Pass the loaded scene to the renderer directly
        if (modelData.scene) {
          const renderer = (window as any).__renderer;
          if (renderer) {
            const layerSync = renderer.layerSync;
            if (layerSync) {
              const layerRenderer = layerSync.getRenderer?.(layer.id);
              if (layerRenderer && typeof layerRenderer.setModel === 'function') {
                layerRenderer.setModel(modelData.scene);
              }
            }
          }
        }
      } catch (err) {
        console.error('[ModelSection] Import failed:', err);
      }
      setLoading(false);
    };
    input.click();
  }, [data, layer.id]);

  const fileName = data.url ? data.url.split('/').pop()?.split('?')[0] ?? 'Model' : '';

  return (
    <Section label="3D Model">
      <PropRow label="Import">
        <button
          onClick={handleImport}
          disabled={loading}
          style={{
            fontSize: 'var(--font-size-xs)',
            padding: '3px 10px',
            background: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Loading...' : data.url ? 'Replace Model' : 'Import Model'}
        </button>
      </PropRow>

      {data.url && (
        <>
          <PropRow label="File">
            <span style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 140,
            }} title={fileName}>
              {fileName}
            </span>
          </PropRow>
          <PropRow label="Format">
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {(data.format ?? 'gltf').toUpperCase()}
            </span>
          </PropRow>
          <PropRow label="Scale">
            <NumberInput
              value={data.scale}
              onChange={v => upd({ scale: v })}
              min={0.01} max={100} step={0.1} precision={2}
            />
          </PropRow>
          <PropRow label="">
            <button
              onClick={() => {
                const renderer = (window as any).__renderer;
                const lr = renderer?.layerSync?.getRenderer(layer.id);
                if (lr && typeof lr.centerOriginToGeometry === 'function') {
                  lr.centerOriginToGeometry();
                  renderer.renderLoop.requestRender();
                }
              }}
              style={{
                fontSize: 'var(--font-size-xs)',
                padding: '3px 10px',
                background: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'center',
              }}
            >
              Set Origin to Geometry Center
            </button>
          </PropRow>
          <PropRow label="Auto Rotate">
            <CheckboxInput
              value={data.autoRotate ?? false}
              onChange={v => upd({ autoRotate: v })}
            />
          </PropRow>
          {(data.autoRotate ?? false) && (
            <PropRow label="Rotate Speed">
              <NumberInput
                value={data.autoRotateSpeed ?? 1}
                onChange={v => upd({ autoRotateSpeed: v })}
                min={0.1} max={10} step={0.1} precision={1}
              />
            </PropRow>
          )}
        </>
      )}
    </Section>
  );
};
