/**
 * UserEditGuard — global registry of (layerId, propertyPath) pairs that
 * the user is CURRENTLY interacting with (dragging a slider, typing in a
 * number input, scrubbing an effect param, etc.).
 *
 * PropertyBinder consults this before writing runtime overrides. If a
 * property is guarded, the binder skips it so the user's live edit isn't
 * overwritten on the next RAF tick.
 *
 * Guards should always be released — safest pattern:
 *   userEditGuard.begin(layerId, path);
 *   try { ... } finally { userEditGuard.end(layerId, path); }
 *
 * For drag handlers, call begin on mousedown, end on mouseup.
 */

class UserEditGuardImpl {
  private _guards = new Set<string>();

  private key(layerId: string, propertyPath: string): string {
    return `${layerId}::${propertyPath}`;
  }

  begin(layerId: string, propertyPath: string): void {
    this._guards.add(this.key(layerId, propertyPath));
  }

  end(layerId: string, propertyPath: string): void {
    this._guards.delete(this.key(layerId, propertyPath));
  }

  isGuarded(layerId: string, propertyPath: string): boolean {
    return this._guards.has(this.key(layerId, propertyPath));
  }

  /** Also match camera pseudo-layer */
  isCameraPropGuarded(propertyPath: string): boolean {
    return this._guards.has(this.key('__camera__', propertyPath));
  }

  clearAll(): void {
    this._guards.clear();
  }

  get size(): number {
    return this._guards.size;
  }
}

export const userEditGuard = new UserEditGuardImpl();