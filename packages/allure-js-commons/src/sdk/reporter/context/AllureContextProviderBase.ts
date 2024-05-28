/* eslint brace-style: 0 */
import type { AllureContext, AllureContextHolder, AllureContextProvider } from "./types.js";

/**
 * Provides the set of methods to access and update the context.
 * Successor classes are responsible for persisting and accessing the context.
 */
export abstract class AllureContextProviderBase<
  TContext extends AllureContext,
  THolder extends AllureContextHolder<TContext>,
> implements AllureContextProvider
{
  /**
   * Gets the holder that contains the current value of the context.
   */
  protected abstract load: () => THolder;

  /**
   * Persist the changes applied to the context since it was last time persisted.
   */
  protected abstract store: (holder: THolder) => void;

  getScope = () => this.getCurrentContext().getScope();

  getFixture = () => this.getCurrentContext().getFixture();

  getTest = () => this.getCurrentContext().getTest();

  getStepRoot = () => this.getFixture() ?? this.getTest();

  getStep = (root?: string) => {
    const resolvedRoot = root ?? this.getStepRoot();
    if (resolvedRoot) {
      return this.getCurrentContext().getStep(resolvedRoot);
    }
    return null;
  };

  getExecutingItem = (root?: string) => {
    const resolvedRoot = root ?? this.getStepRoot();
    if (resolvedRoot) {
      return this.getStep(resolvedRoot) ?? resolvedRoot;
    }
    return null;
  };

  addScope = (uuid: string) => this.update((b) => b.addScope(uuid));

  removeScope = (uuid?: string) => this.update((b) => (uuid ? b.removeScopeByUuid(uuid) : b.removeScope()));

  setFixture = (uuid: string) => this.update((b) => b.setFixture(uuid));

  removeFixture = (uuid?: string) => {
    if (!uuid || this.getFixture() === uuid) {
      this.update((b) => b.removeFixture());
    }
  };

  setTest = (uuid: string) => this.update((b) => b.setTest(uuid));

  removeTest = (uuid?: string) => {
    if (!uuid || this.getTest() === uuid) {
      this.update((b) => b.removeTest());
    }
  };

  addStep = (uuid: string, root?: string) => {
    const resolvedRoot = root ?? this.getStepRoot();
    if (resolvedRoot) {
      this.update((b) => b.addStep(resolvedRoot, uuid));
    }
  };

  removeStep = (root?: string) => {
    const resolvedRoot = root ?? this.getStepRoot();
    if (resolvedRoot) {
      this.update((b) => b.removeStep(resolvedRoot));
    }
  };

  private getCurrentContext = () => this.load().get();

  private update = (fn: (holder: THolder) => void) => {
    const holder = this.load();
    fn(holder);
    this.store(holder);
  };
}
