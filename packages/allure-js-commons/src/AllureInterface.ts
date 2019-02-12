import { Severity } from "./model";
import { ContentType } from "./model";
import { LabelName } from "./model";
import { GlobalInfoWriter } from "./GlobalInfoWriter";

export abstract class AllureInterface {
  public abstract setDescription(text: string): void;

  public abstract setFlaky(): void;

  public abstract setKnown(): void;

  public abstract setMuted(): void;

  public abstract addOwner(owner: string): void;

  public abstract setSeverity(severity: Severity): void;

  public abstract addIssue(issue: string): void;

  public abstract addTag(tag: string): void;

  public abstract addTestType(type: string): void;

  public abstract addLink(name: string, url: string, type?: string): void;

  public abstract step<T>(name: string, body: () => any): any;

  public abstract attachment(name: string, content: Buffer | string, type: ContentType): void;

  public abstract addParameter(name: string, value: string): void;

  public abstract getGlobalInfoWriter(): GlobalInfoWriter;

  // below are compatibility functions

  /**
   * @deprecated Use step function
   */
  public createStep(name: string, stepFunction: Function) {
    return (...args: any[]): any => this.step(name, () => stepFunction.apply(this, args));
  }

  /**
   * @deprecated Use attachment function
   */
  public createAttachment(name: string, content: Buffer | string | Function, type: ContentType) {
    if (typeof content === "function") {
      return (...args: any[]) => {
        this.attachment(name, content.apply(this, args), type);
      };
    } else {
      this.attachment(name, content, type);
    }
  }

  /**
   * @deprecated
   */
  public abstract addLabel(name: string, value: string): void;

  /**
   * @deprecated
   */
  public addArgument(name: string, value: string) {
    this.addParameter(name, value);
  }

  /**
   * @deprecated
   */
  public addEnvironment(name: string, value: string) {
    this.addParameter(`ENV[${name}]`, value);
  }

  /**
   * @deprecated use setDescription
   */
  public description(description: string, type: string) {
    this.setDescription(description); // fixme what about type?
  }

  /**
   * @deprecated use setSeverity
   */
  public severity(severity: string) {
    this.addLabel(LabelName.SEVERITY, severity);
  }

  /**
   * @deprecated
   */
  public epic(epic: string) {
    this.addLabel(LabelName.EPIC, epic);
  }

  /**
   * @deprecated
   */
  public feature(feature: string) {
    this.addLabel(LabelName.FEATURE, feature);
  }

  /**
   * @deprecated
   */
  public story(story: string) {
    this.addLabel(LabelName.STORY, story);
  }
}
