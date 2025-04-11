import type { MarkedExtension } from 'marked';
import * as wikirefs from 'wikirefs';


export function wikilinks(opts: any = {}): MarkedExtension {
  return {
    extensions: [
      {
        name: 'wikilinks',
        level: 'inline',
        start(src: string) {
          const match: RegExpExecArray | null = new RegExp(wikirefs.RGX.WIKI.LINK.source, 'gm').exec(src);
          return match ? 0 : -1;
        },
        tokenizer(src: string) {
          const match: RegExpExecArray | null = wikirefs.RGX.WIKI.LINK.exec(src);
          if (!match || match.length < 1 || match.index !== 0) {
            return undefined;
          }
          const token = {
            type: 'wikilinks',
            raw: match[0],
            linktype: match[1] ? match[1].trim() : null,
            filename: match[2],
            label: match[3],
          };
          return token;
        },
        renderer(token: any) {
          // token fields
          const raw: string = token.raw;
          const filename: string = token.filename;
          const linktype: string | null = token.linktype;
          const label: string | null = token.label;
          // opts
          const cssNames: any = opts.cssNames || {};
          const htmlHref: string = opts.resolveHtmlHref ? opts.resolveHtmlHref(filename) : '/' + filename;
          const htmlText: string | undefined = opts.resolveHtmlText ? opts.resolveHtmlText(filename) : filename;
          const doctype: string | undefined = opts.resolveDocType ? opts.resolveDocType(filename) : '';
          // invalid
          if (!htmlHref) {
            return `<a class="${cssNames.wiki || 'wiki'} ${cssNames.link || 'link'} ${cssNames.invalid || 'invalid'}">${raw}</a>`;
          // valid
          } else {
            const cssClassArray: string[] = [];
            cssClassArray.push(cssNames.wiki || 'wiki');
            cssClassArray.push(cssNames.link || 'link');
            // linktype
            if (linktype) {
              cssClassArray.push(cssNames.type || 'type');
              const linkTypeSlug: string = linktype.trim().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
              cssClassArray.push((cssNames.reftype || 'reftype__') + linkTypeSlug);
            }
            // doctype
            if (doctype) {
              const docTypeSlug: string = doctype.trim().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
              cssClassArray.push((cssNames.doctype || 'doctype__') + docTypeSlug);
            }
            const css: string = cssClassArray.join(' ');
            // display text
            let displayText: string = filename;
            for (const content of [label, htmlText, filename]) {
              if (typeof content === 'string' && content.length > 0) {
                displayText = content;
                break;
              }
            }
            // create link
            const html: string = `<a class="${css}" href="${opts.baseUrl || ''}${htmlHref}" data-href="${opts.baseUrl || ''}${htmlHref}">${displayText}</a>`;
            // add metadata
            if (opts.addLink) {
              opts.addLink(linktype || '', filename);
            }
            return html;
          }
        }
      }
    ]
  };
} 