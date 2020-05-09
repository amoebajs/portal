export function createDisplayName(i: any) {
  return i.displayName !== i.name ? i.displayName + " (" + i.name + ")" : i.displayName;
}
