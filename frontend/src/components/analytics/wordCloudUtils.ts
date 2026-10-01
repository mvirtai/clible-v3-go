export function getWordCloudFontSize(
  termLength: number,
  frequencyRatio: number,
): number {
  const maxSize =
    termLength > 20 ? 22 :
    termLength > 14 ? 28 :
    termLength > 8 ? 34 :
    49;

  return Math.min(Math.round(13 + frequencyRatio * 36), maxSize);
}
