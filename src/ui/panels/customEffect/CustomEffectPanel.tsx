/**
 * CustomEffectPanel — full custom effect authoring panel.
 * Split layout: compact list on top, full editor (with tabs) below.
 * Includes docs tab and installable examples gallery.
 */
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Plus, Download, Upload, Copy, Trash2, AlertTriangle, Code2,
  Save, Check, X, ChevronDown, ChevronRight, BookOpen, Package,
} from 'lucide-react';
import { useCustomEffectsStore } from '../../../state/customEffectsStore';
import { useNotificationStore } from '../../../state/notificationStore';
import { confirm } from '../../common/ConfirmDialog';
import { ShaderEditor } from './ShaderEditor';
import { ParamSchemaEditor } from './ParamSchemaEditor';
import { MetadataEditor } from './MetadataEditor';
import { EffectPreview } from './EffectPreview';
import { ShaderDocs } from './ShaderDocs';
import { ExampleEffectsGallery } from './ExampleEffectsGallery';
import type { CompileResult } from '../../../renderer/effects/customEffectAdapter';
import type { CustomEffectDefinition } from '../../../types/customEffect';

type EditorTab = 'shader' | 'params' | 'settings' | 'docs';

export const CustomEffectPanel: React.FC = () => {
  const effects = useCustomEffectsStore(s => s.effects);
  const brokenIds = useCustomEffectsStore(s => s.brokenIds);
  const create = useCustomEffectsStore(s => s.create);
  const remove = useCustomEffectsStore(s => s.remove);
  const update = useCustomEffectsStore(s => s.update);
  const duplicate = useCustomEffectsStore(s => s.duplicate);
  const exportToFile = useCustomEffectsStore(s => s.exportToFile);
  const importFromFile = useCustomEffectsStore(s => s.importFromFile);
  const addNotif = useNotificationStore(s => s.addNotification);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<EditorTab>('shader');
  const [compileResult, setCompileResult] = useState<CompileResult>({ ok: true });
  const [listCollapsed, setListCollapsed] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDef = useMemo(
    () => effects.find(e => e.id === selectedId) ?? null,
    [effects, selectedId],
  );

  const [draft, setDraft] = useState<Partial<CustomEffectDefinition>>({});

  const editDef: CustomEffectDefinition | null = useMemo(() => {
    if (!selectedDef) return null;
    return { ...selectedDef, ...draft } as CustomEffectDefinition;
  }, [selectedDef, draft]);

  const isDirty = Object.keys(draft).length > 0;

  // Reset draft when selection changes
  useEffect(() => {
    setDraft({});
    setCompileResult({ ok: true });
  }, [selectedId]);

  // Watch for gallery request from sidebar context menu
  const showGalleryRequest = useCustomEffectsStore(s => s.showGalleryRequest);
  useEffect(() => {
    if (showGalleryRequest > 0) setShowGallery(true);
  }, [showGalleryRequest]);

  const selectEffect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedId || !isDirty) return;
    const result = update(selectedId, draft);
    if (result.ok) {
      setDraft({});
      addNotif({ type: 'success', message: 'Effect saved & recompiled', autoDismiss: 2000 });
    } else {
      addNotif({ type: 'error', message: `Save failed: ${result.error}` });
    }
  }, [selectedId, draft, isDirty, update, addNotif]);

  const handleNew = useCallback(() => {
    const def = create(`Custom Effect ${effects.length + 1}`);
    selectEffect(def.id);
    setTab('shader');
  }, [create, effects.length, selectEffect]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    const yes = await confirm(`Delete "${name}"?`, 'Delete Custom Effect', { confirmLabel: 'Delete' });
    if (yes) {
      await remove(id);
      if (selectedId === id) selectEffect(null);
    }
  }, [remove, selectedId, selectEffect]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const def = await importFromFile(file);
    if (def) {
      selectEffect(def.id);
      setTab('shader');
    }
  }, [importFromFile, selectEffect]);

  const updateDraft = useCallback((patch: Partial<CustomEffectDefinition>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  }, []);

  const handleCompileResult = useCallback((result: CompileResult) => {
    setCompileResult(result);
  }, []);

  const tabs: EditorTab[] = ['shader', 'params', 'settings', 'docs'];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-panel)' }}>
      {/* Header */}
      <div
        className="flex items-center px-3 shrink-0"
        style={{ height: 36, borderBottom: '1px solid var(--color-border)' }}
      >
        <Code2
          size={13}
          strokeWidth={1.75}
          style={{ color: 'var(--color-accent)', marginRight: 6 }}
        />
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: 'var(--color-text-primary)', flex: 1,
        }}>
          Custom Effects
        </span>
        <button
          onClick={() => setShowGallery(true)}
          title="Browse examples"
          className="border-0 bg-transparent cursor-pointer"
          style={{ color: 'var(--color-text-secondary)', padding: 2 }}
        >
          <Package size={12} />
        </button>
        <button
          onClick={() => setTab('docs')}
          title="Documentation"
          className="border-0 bg-transparent cursor-pointer"
          style={{ color: 'var(--color-text-secondary)', padding: 2 }}
        >
          <BookOpen size={12} />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Import .onionfx"
          className="border-0 bg-transparent cursor-pointer"
          style={{ color: 'var(--color-text-secondary)', padding: 2 }}
        >
          <Upload size={12} />
        </button>
        <button
          onClick={handleNew}
          title="New effect"
          className="border-0 bg-transparent cursor-pointer"
          style={{ color: 'var(--color-accent)', padding: 2 }}
        >
          <Plus size={14} strokeWidth={2} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".onionfx,.json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />
      </div>

      {/* Broken notice */}
      {brokenIds.length > 0 && (
        <div style={{
          padding: '4px 8px',
          background: 'rgba(255,165,0,0.1)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <AlertTriangle size={10} style={{ color: 'orange' }} />
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
            {brokenIds.length} failed to load
          </span>
        </div>
      )}

      {/* Effect list (collapsible) */}
      <div className="shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setListCollapsed(!listCollapsed)}
          className="w-full flex items-center gap-1 border-0 bg-transparent cursor-pointer"
          style={{
            height: 24, padding: '0 8px',
            fontSize: 10, color: 'var(--color-text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}
        >
          {listCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
          Effects ({effects.length})
        </button>

        {!listCollapsed && (
          <div style={{ maxHeight: 150, overflowY: 'auto', padding: '0 4px 4px' }}>
            {effects.length === 0 && (
              <div style={{
                fontSize: 10, color: 'var(--color-text-disabled)',
                padding: '8px 4px', textAlign: 'center',
              }}>
                Click + to create or browse examples
              </div>
            )}
            {effects.map(effect => (
              <div
                key={effect.id}
                onClick={() => selectEffect(effect.id)}
                className="group flex items-center gap-1 cursor-pointer"
                style={{
                  padding: '3px 6px', borderRadius: 3, marginBottom: 1,
                  background: selectedId === effect.id
                    ? 'var(--color-accent-muted)'
                    : 'transparent',
                  fontSize: 11,
                }}
                onMouseEnter={e => {
                  if (selectedId !== effect.id)
                    (e.currentTarget as HTMLElement).style.background = 'var(--color-panel-hover)';
                }}
                onMouseLeave={e => {
                  if (selectedId !== effect.id)
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <span
                  className="truncate flex-1"
                  style={{
                    color: selectedId === effect.id
                      ? 'var(--color-accent)'
                      : 'var(--color-text-primary)',
                    fontWeight: 500,
                  }}
                >
                  {effect.displayName}
                </span>
                <span style={{ fontSize: 9, color: 'var(--color-text-disabled)' }}>
                  {effect.category}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); exportToFile(effect.id); }}
                  className="border-0 bg-transparent cursor-pointer opacity-0 group-hover:opacity-60"
                  style={{ color: 'var(--color-text-secondary)', padding: 1 }}
                >
                  <Download size={10} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); duplicate(effect.id); }}
                  className="border-0 bg-transparent cursor-pointer opacity-0 group-hover:opacity-60"
                  style={{ color: 'var(--color-text-secondary)', padding: 1 }}
                >
                  <Copy size={10} />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    void handleDelete(effect.id, effect.displayName);
                  }}
                  className="border-0 bg-transparent cursor-pointer opacity-0 group-hover:opacity-60"
                  style={{ color: 'var(--color-danger)', padding: 1 }}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar — always visible */}
      <div
        className="flex items-center gap-1 px-2 shrink-0"
        style={{ height: 30, borderBottom: '1px solid var(--color-border)' }}
      >
        {tabs.map(t => {
          const disabled = t !== 'docs' && !editDef;
          return (
            <button
              key={t}
              onClick={() => { if (!disabled) setTab(t); }}
              className="border-0 cursor-pointer"
              style={{
                height: 22, padding: '0 8px', borderRadius: 3,
                fontSize: 10,
                fontWeight: tab === t ? 600 : 400,
                textTransform: 'capitalize',
                background: tab === t ? 'var(--color-accent-muted)' : 'transparent',
                color: tab === t ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                opacity: disabled ? 0.35 : 1,
                pointerEvents: disabled ? 'none' : 'auto',
              }}
            >
              {t}
            </button>
          );
        })}

        <div className="flex-1" />

        {/* Compile status — only when editor is active */}
        {editDef && tab !== 'docs' && (
          <div className="flex items-center gap-1" style={{ fontSize: 10 }}>
            {compileResult.ok ? (
              <>
                <Check size={10} style={{ color: '#22c55e' }} />
                <span style={{ color: '#22c55e' }}>OK</span>
              </>
            ) : (
              <>
                <X size={10} style={{ color: '#ef4444' }} />
                <span style={{ color: '#ef4444' }}>Error</span>
              </>
            )}
          </div>
        )}

        {/* Save button */}
        {editDef && tab !== 'docs' && (
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="flex items-center gap-1 border-0 cursor-pointer"
            style={{
              height: 22, padding: '0 8px', borderRadius: 3,
              fontSize: 10, fontWeight: 600,
              background: isDirty ? 'var(--color-accent)' : 'var(--color-input-bg)',
              color: isDirty ? '#fff' : 'var(--color-text-disabled)',
              opacity: isDirty ? 1 : 0.5,
            }}
          >
            <Save size={10} /> Save
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* DOCS — always renderable, no effect needed */}
        {tab === 'docs' && (
          <div className="h-full overflow-auto" style={{ padding: 8 }}>
            <ShaderDocs />
          </div>
        )}

        {/* No effect selected */}
        {tab !== 'docs' && !editDef && (
          <div
            className="flex-1 flex items-center justify-center flex-col gap-3 h-full"
            style={{ color: 'var(--color-text-disabled)', fontSize: 11 }}
          >
            <div>Select or create an effect to edit</div>
            <button
              onClick={() => setTab('docs')}
              className="flex items-center gap-1 border-0 cursor-pointer"
              style={{
                padding: '4px 10px', borderRadius: 4, fontSize: 10,
                background: 'var(--color-input-bg)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <BookOpen size={11} /> Read the docs
            </button>
            <button
              onClick={() => setShowGallery(true)}
              className="flex items-center gap-1 border-0 cursor-pointer"
              style={{
                padding: '4px 10px', borderRadius: 4, fontSize: 10,
                background: 'var(--color-accent-muted)',
                color: 'var(--color-accent)',
              }}
            >
              <Package size={11} /> Browse examples
            </button>
          </div>
        )}

        {/* SHADER TAB */}
        {tab === 'shader' && editDef && (
          <div className="flex flex-col h-full gap-2" style={{ padding: 8 }}>
            <div className="flex gap-2" style={{ flex: 1, minHeight: 0 }}>
              {/* Editor takes most of the space */}
              <div className="flex flex-col flex-1 min-w-0 min-h-0">
                <ShaderEditor
                  value={editDef.fragmentShader}
                  onChange={src => updateDraft({ fragmentShader: src })}
                  errorLines={compileResult.errorLines}
                />
              </div>
              {/* Preview pane — always visible on shader tab */}
              <div className="shrink-0">
                <EffectPreview
                  def={editDef}
                  onCompileResult={handleCompileResult}
                />
              </div>
            </div>

            {/* Error box */}
            {!compileResult.ok && compileResult.error && (
              <div style={{
                padding: '6px 8px', borderRadius: 4,
                background: 'rgba(255,60,60,0.1)',
                border: '1px solid rgba(255,60,60,0.3)',
                fontSize: 10, color: '#ff5555',
                fontFamily: 'var(--font-family-mono)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                maxHeight: 80, overflowY: 'auto',
                flexShrink: 0,
              }}>
                {compileResult.error}
              </div>
            )}
          </div>
        )}

        {/* PARAMS TAB */}
        {tab === 'params' && editDef && (
          <div className="flex gap-3 h-full" style={{ padding: 8, overflowY: 'auto' }}>
            <div className="flex-1 min-w-0">
              <ParamSchemaEditor
                parameters={editDef.parameters}
                onChange={params => updateDraft({ parameters: params })}
              />
            </div>
            <div className="shrink-0">
              <EffectPreview
                def={editDef}
                onCompileResult={handleCompileResult}
              />
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && editDef && (
          <div className="flex gap-3 h-full" style={{ padding: 8, overflowY: 'auto' }}>
            <div className="flex-1 min-w-0">
              <MetadataEditor
                def={editDef}
                onChange={updateDraft}
              />
            </div>
            <div className="shrink-0">
              <EffectPreview
                def={editDef}
                onCompileResult={handleCompileResult}
              />
            </div>
          </div>
        )}
      </div>

      {showGallery && (
        <ExampleEffectsGallery
          onClose={() => setShowGallery(false)}
          onInstalled={id => {
            setShowGallery(false);
            selectEffect(id);
            setTab('shader');
          }}
        />
      )}
    </div>
  );
};

export default CustomEffectPanel;