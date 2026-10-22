export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export const plainTextToEmailHtml = (body: string): string =>
  body
    .split(/\n\n+/)
    .map((paragraph) => {
      const lines = paragraph
        .split('\n')
        .map((line) => escapeHtml(line))
        .join('<br>\n');
      return `<p>${lines}</p>`;
    })
    .join('\n');
