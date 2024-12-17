export default function wikirefsExtension(opts: any = {}) {
  return {
    extensions: [
      {
        name: 'wikirefs',
        level: 'inline',
        start(src: string) {
          return src.indexOf('[[');
        },
        tokenizer(src: string) {
          if (src.startsWith('[[') && src.endsWith(']]')) {
            return {
              type: 'wikirefs',
              raw: src,
            };
          }
          return null;
        },
        renderer(token: any) {
          return '<a href="url">fname</a>';
        },
      },
    ],
  };
}
