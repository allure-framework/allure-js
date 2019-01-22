export enum ContentType {
  TEXT = "text/plain",
  XML = "application/xml",
  CSV = "text/csv",
  TSV = "text/tab-separated-values",
  CSS = "text/css",
  URI = "text/uri-list",
  SVG = "image/svg+xml",
  PNG = "image/png",
  JSON = "application/json",
  WEBM = "video/webm",
  JPEG = "image/jpeg"
}

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
