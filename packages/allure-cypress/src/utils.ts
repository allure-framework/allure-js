export const uint8ArrayToBase64 = (data: unknown) => {
  // @ts-ignore
  const u8arrayLike = Array.isArray(data) || data.buffer;

  if (!u8arrayLike) {
    return data as string;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return btoa(String.fromCharCode.apply(null, data as number[]));
};

export const normalizeAttachmentContentEncoding = (data: unknown, encoding: BufferEncoding): BufferEncoding => {
  // @ts-ignore
  const u8arrayLike = Array.isArray(data) || data.buffer;

  if (u8arrayLike) {
    return "base64";
  }

  return encoding;
};
