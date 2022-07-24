export const getBufferEncoding = (encoding: any): BufferEncoding => {
  switch(encoding) {
    case "BASE64":
      return "base64";
    default:
    return "utf-8";
  }
 };
