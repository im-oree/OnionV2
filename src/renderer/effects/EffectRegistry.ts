/**
 * EffectRegistry — central registry of all available effects.
 * Effects register themselves on app startup via the barrel import.
 */
import type { EffectDefinition, EffectType, EffectCategory } from '../../types/effect';

class EffectRegistryClass {
  private definitions = new Map<EffectType, EffectDefinition>();

  register(def: EffectDefinition): void {
    this.definitions.set(def.type, def);
  }

  get(type: EffectType): EffectDefinition | undefined {
    return this.definitions.get(type);
  }

  list(): EffectDefinition[] {
    return Array.from(this.definitions.values());
  }

  listByCategory(category: EffectCategory): EffectDefinition[] {
    return this.list().filter((d) => d.category === category);
  }

  listCategories(): EffectCategory[] {
    const cats = new Set<EffectCategory>();
    for (const d of this.definitions.values()) cats.add(d.category);
    return Array.from(cats);
  }
}

export const effectRegistry = new EffectRegistryClass();
