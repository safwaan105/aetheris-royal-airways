const ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePnr(length = 6) {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }
  return result;
}
