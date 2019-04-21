export function objUtil({ type, id }) {
  return [id, type];
}

export function arrUtil([a, b]) {
  const type: import('./models/model').Type = { a, b };
  return type;
}
