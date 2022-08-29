import { AttachmentOptions, ContentType } from "../model";

export const typeToExtension = (options: AttachmentOptions): string => {
  if (options.fileExtension) {
    return options.fileExtension;
  }
  switch (options.contentType) {
    case ContentType.TEXT:
      return "txt";
    case ContentType.XML:
      return "xml";
    case ContentType.HTML:
      return "html";
    case ContentType.CSV:
      return "csv";
    case ContentType.TSV:
      return "tsv";
    case ContentType.CSS:
      return "css";
    case ContentType.URI:
      return "uri";
    case ContentType.SVG:
      return "svg";
    case ContentType.PNG:
      return "png";
    case ContentType.JSON:
      return "json";
    case ContentType.ZIP:
      return "ZIP";
    case ContentType.WEBM:
      return "webm";
    case ContentType.JPEG:
      return "jpg";
  }
  throw new Error(`Unrecognized extension: ${options.contentType}`);
};
