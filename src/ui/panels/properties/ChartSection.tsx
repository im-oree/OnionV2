import React from 'react';
import { Section, PropRow } from './Section';
import { NumberInput } from './inputs/NumberInput';
import { SelectInput } from './inputs/SelectInput';
import { useCompositionStore } from '../../../state/compositionStore';
import { parseCSV } from '../../../utils/csvParser';

export const ChartSection: React.FC<{layer: any, compId: string}> = ({ layer, compId }) => {
  const data = layer.data;
  const upd = (patch: any) => 
    useCompositionStore.getState().updateLayer(compId, layer.id, { data: { ...data, ...patch } });

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const csvData = await parseCSV(e.target.files[0]);
      const points = csvData.map(d => ({ 
        label: Object.values(d)[0] as string, 
        value: parseFloat(Object.values(d)[1] as string) || 0 
      }));
      upd({ points });
    }
  };

  return (
    <Section label="Chart Data">
      <PropRow label="Type">
        <SelectInput 
          value={data.type} 
          options={[{label:'Pie', value:'pie'}, {label:'Donut', value:'donut'}, {label:'Bar', value:'bar'}]} 
          onChange={v => upd({type: v})} 
        />
      </PropRow>
      <PropRow label="Build-on">
        <NumberInput value={data.progress} min={0} max={1} step={0.01} onChange={v => upd({progress: v})} />
      </PropRow>
      <PropRow label="Spacing">
        <NumberInput value={data.spacing} min={0} max={50} onChange={v => upd({spacing: v})} />
      </PropRow>
      <PropRow label="Import CSV">
        <input type="file" accept=".csv" onChange={onFileChange} className="text-[10px]" />
      </PropRow>
    </Section>
  );
};
