import { signal, computed, Signal, untracked, WritableSignal } from '@angular/core';

export type AxonGraph<S extends string | number, T> = Partial<Record<S, (S | { to: S; guard: (context: T) => boolean })[]>>;

export class Axon<S extends string | number, T> {
  private readonly _state: WritableSignal<{ status: S; context: T }>;
  private readonly _canGoCache = new Map<S, Signal<boolean>>();

  readonly state = computed(() => this._state().status);
  readonly context = computed(() => this._state().context);

  /**
   * The 'Can' Proxy: Access reactive transition checks as properties.
   * Typed as a Record of your states to provide full IDE autocompletion.
   */
  readonly can: Record<S, Signal<boolean>> = new Proxy({} as Record<S, Signal<boolean>>, {
    get: (_, nextState: string | symbol) => this.canGo(nextState as S)
  });

  constructor(
    private initialState: S,
    private initialContext: T,
    private graph: AxonGraph<S, T>
  ) {
    // Initialize signal inside constructor so parameters are available
    this._state = signal({
      status: this.initialState,
      context: this.initialContext,
    });
  }

  static create<S extends string | number, T>(
    initialState: S,
    context: T,
    graph: AxonGraph<S, T>
  ) {
    return new Axon<S, T>(initialState, context, graph);
  }

  canGo(nextState: S): Signal<boolean> {
    let canGoSignal = this._canGoCache.get(nextState);
    
    if (!canGoSignal) {
      canGoSignal = computed(() => {
        const { status, context } = this._state();
        const allowed = this.graph[status] ?? [];
        
        return allowed.some(entry => {
          if (typeof entry === 'object' && entry !== null) {
            return entry.to === nextState && entry.guard(context);
          }
          return entry === nextState;
        });
      });
      
      this._canGoCache.set(nextState, canGoSignal);
    }
    return canGoSignal;
  }

  go(nextState: S, updater?: (current: T) => T): boolean {
    return untracked(() => {
      if (this.canGo(nextState)()) {
        this._state.update((prev) => ({
          status: nextState,
          context: updater ? updater(prev.context) : prev.context,
        }));
        return true;
      }
      return false;
    });
  }

  is(status: S): boolean {
    return this._state().status === status;
  }
}