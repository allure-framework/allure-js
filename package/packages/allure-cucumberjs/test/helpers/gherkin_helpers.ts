// https://github.com/cucumber/cucumber-js/blob/main/test/gherkin_helpers.ts
import EventEmitter from "events";
import { IGherkinOptions } from "@cucumber/gherkin";
import { GherkinStreams } from "@cucumber/gherkin-streams";
import * as messages from "@cucumber/messages";
import { SourceMediaType } from "@cucumber/messages";

export interface IGenerateEventsRequest {
  data: string;
  eventBroadcaster: EventEmitter;
  uri: string;
}

export const generateEvents = async ({
  data,
  eventBroadcaster,
  uri,
}: IGenerateEventsRequest): Promise<IParsedSource> => {
  const { envelopes, source, gherkinDocument, pickles } = await parse({
    data,
    uri,
  });
  envelopes.forEach((envelope) => eventBroadcaster.emit("envelope", envelope));
  return { source, gherkinDocument, pickles };
};

export interface IParsedSource {
  pickles: messages.Pickle[];
  source: messages.Source;
  gherkinDocument: messages.GherkinDocument;
}

export interface IParsedSourceWithEnvelopes extends IParsedSource {
  envelopes: messages.Envelope[];
}

export interface IParseRequest {
  data: string;
  uri: string;
  options?: IGherkinOptions;
}

export const parse = async ({
  data,
  uri,
  options,
}: IParseRequest): Promise<IParsedSourceWithEnvelopes> => {
  const sources: messages.Envelope[] = [
    {
      source: {
        uri,
        data: data,
        mediaType: SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
      },
    },
  ];
  return new Promise<IParsedSourceWithEnvelopes>((resolve, reject) => {
    let source: messages.Source;
    let gherkinDocument: messages.GherkinDocument;
    const pickles: messages.Pickle[] = [];
    const envelopes: messages.Envelope[] = [];
    const messageStream = GherkinStreams.fromSources(sources, options || {});
    messageStream.on("data", (envelope: messages.Envelope) => {
      envelopes.push(envelope);
      if (envelope.source) {
        source = envelope.source;
      }
      if (envelope.gherkinDocument) {
        gherkinDocument = envelope.gherkinDocument;
      }
      if (envelope.pickle) {
        pickles.push(envelope.pickle);
      }
      if (envelope.attachment) {
        reject(new Error(`Parse error in '${uri}': ${envelope.attachment.body}`));
      }
    });
    messageStream.on("end", () => {
      resolve({
        envelopes,
        source,
        gherkinDocument,
        pickles,
      });
    });
    messageStream.on("error", reject);
  });
};
