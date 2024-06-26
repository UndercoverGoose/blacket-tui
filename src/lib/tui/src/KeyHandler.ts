export function handle_key(text: string): string {
  const codes = text.split('').map(c => c.charCodeAt(0));
  const str = codes.join('-');
  switch (str) {
    case '27-91-65':
      return 'arrow:up';
    case '27-91-66':
      return 'arrow:down';
    case '27-91-67':
      return 'arrow:right';
    case '27-91-68':
      return 'arrow:left';
    case '3':
      return 'meta:quit';
    case '9':
      return 'meta:tab';
    case '27-91-90':
      return 'key:reverse-tab';
    case '13':
      return 'key:enter';
    case '27':
      return 'meta:escape';
    case '127':
      return 'key:backspace';
  }
  return 'char:' + String.fromCharCode(...codes);
}
