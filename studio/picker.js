// A pulldown of every registered character, grouped by category in catalog
// order; choosing one opens its detail page.
export function characterPicker(catalog, currentId = '') {
  const wrap = document.createElement('div'); wrap.className = 'picker';
  const label = document.createElement('label'); label.htmlFor = 'character-picker'; label.textContent = 'キャラクターを選ぶ';
  const select = document.createElement('select'); select.id = 'character-picker';
  if (!currentId) { const hint = new Option('一覧から選ぶ…', '', true, true); hint.disabled = true; select.append(hint); }
  const groups = new Map();
  for (const entry of catalog) {
    if (!groups.has(entry.category)) { const group = document.createElement('optgroup'); group.label = entry.category; groups.set(entry.category, group); select.append(group); }
    groups.get(entry.category).append(new Option(entry.name, entry.id, false, entry.id === currentId));
  }
  select.addEventListener('change', () => { if (select.value) location.hash = `#character/${encodeURIComponent(select.value)}`; });
  wrap.append(label, select);
  return wrap;
}
