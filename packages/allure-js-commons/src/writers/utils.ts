import { ContentType } from "../model";

export function typeToExtension(type: ContentType): string {
  switch (type) {
    case ContentType.TEXT:
      return "txt";
    case ContentType.XML:
      return "xml";
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
    case ContentType.WEBM:
      return "webm";
    case ContentType.JPEG:
      return "jpg";
  }
  throw new Error(`Unrecognized extension: ${type}`);
}
