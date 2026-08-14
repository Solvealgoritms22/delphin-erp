declare module 'prismjs' {
  const Prism: any;
  export default Prism;
  export const languages: Record<string, any>;
  export function highlight(text: string, grammar: any, language: string): string;
}

declare module 'prismjs/*' {
  const content: any;
  export default content;
}
