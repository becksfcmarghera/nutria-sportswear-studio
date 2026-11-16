export function parseObject(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}
export function draftRows(value) {
  if (!Array.isArray(value)) throw new Error('Risposta non valida');
  return value.map(row => ({...row, details: parseObject(row.details), files: parseObject(row.files)}));
}
