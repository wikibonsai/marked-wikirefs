import type { MarkedExtension } from 'marked';
import * as wikirefs from 'wikirefs';

function extname(fname: string): string {
  const idx: number = fname.lastIndexOf('.');
  return idx >= 0 ? fname.slice(idx) : '';
}

interface EmbedPlaceholder {
  filename: string;
  hText?: string | undefined;
}

export function wikiembeds(opts: any = {}): MarkedExtension {
  // track note-embed content placeholders to fill in postprocess (async content resolution)
  const embedPlaceholders: Map<string, EmbedPlaceholder> = new Map();
  const cssNames: any = opts.cssNames || {};
  const cn = (key: string, dflt: string): string => cssNames[key] || dflt;

  // build the block HTML for a single embed (note -> <article>; media -> <figure>). the
  // <article>/<figure> is BLOCK content and cannot live inside a <p>, so an embed is detected
  // inline (below) and this block is HOISTED out of its paragraph by the paragraph renderer.
  function renderEmbedBlock(filename: string, hText: string | undefined, label: string | undefined): string {
    let htmlHref: string | undefined = opts.resolveHtmlHref ? opts.resolveHtmlHref(filename) : '/' + filename;
    if (htmlHref && hText) { htmlHref = htmlHref + '#' + wikirefs.slugify(hText); }
    const htmlText: string = (opts.resolveHtmlText && opts.resolveHtmlText(filename)) ? opts.resolveHtmlText(filename) : filename;
    const doctype: string | undefined = opts.resolveDocType ? opts.resolveDocType(filename) : '';
    const baseUrl: string = opts.baseUrl || '';
    // metadata
    if (opts.addEmbed) { opts.addEmbed(filename); }

    // media embed -> <figure class="embed-media"> (+ optional <figcaption> from |label)
    if (wikirefs.isMedia(filename)) {
      const filenameSlug: string = filename.trim().toLowerCase().replace(/ /g, '-');
      const mediaExt: string = extname(filename).toLowerCase();
      const mime: string = extname(filename).replace('.', '').toLowerCase();
      const src: string = htmlHref ? ` src="${baseUrl}${htmlHref}"` : '';
      let media: string;
      if (mediaExt === wikirefs.CONST.EXTS.PDF) {
        const data: string = htmlHref ? `${baseUrl}${htmlHref}` : '';
        media = `<object class="${cn('embedPdf', 'embed-pdf')}" data="${data}" type="application/pdf">\n`
              + `<a href="${data}">${filenameSlug}</a>\n`
              + `</object>`;
      } else if (wikirefs.CONST.EXTS.AUD.has(mediaExt)) {
        media = `<audio class="${cn('embedAudio', 'embed-audio')}" controls type="audio/${mime}"${src}></audio>`;
      } else if (wikirefs.CONST.EXTS.IMG.has(mediaExt)) {
        media = `<img class="${cn('embedImage', 'embed-image')}"${src} alt="${filenameSlug}">`;
      } else if (wikirefs.CONST.EXTS.VID.has(mediaExt)) {
        media = `<video class="${cn('embedVideo', 'embed-video')}" controls type="video/${mime}"${src}></video>`;
      } else {
        media = 'media error';
      }
      const caption: string = (label !== undefined && label.length > 0) ? `<figcaption>${label}</figcaption>\n` : '';
      return `<figure class="${cn('embedMedia', 'embed-media')}" src="${filenameSlug}" alt="${filenameSlug}">\n`
           + `${media}\n${caption}</figure>\n`;
    }

    // note (markdown) embed -> <article class="embed-wrapper">
    const placeholderId: string = `embed-${Math.random().toString(36).substring(2, 15)}`;
    let html: string = `<article class="${cn('embedWrapper', 'embed-wrapper')}">\n`;
    // title
    html += `<div class="${cn('embedTitle', 'embed-title')}">\n`;
    if (htmlHref) {
      const css: string[] = [ cn('wiki', 'wiki'), cn('embed', 'embed') ];
      if (doctype) { css.push(cn('doctype', 'doctype__') + wikirefs.slugify(doctype)); }
      html += `<a class="${css.join(' ')}" href="${baseUrl}${htmlHref}" data-href="${baseUrl}${htmlHref}">\n${htmlText}\n</a>\n`;
    } else {
      html += `<a class="${cn('wiki', 'wiki')} ${cn('embed', 'embed')} ${cn('invalid', 'invalid')}">\n${htmlText}\n</a>\n`;
    }
    html += '</div>\n';
    // link
    html += `<div class="${cn('embedLink', 'embed-link')}">\n`;
    if (htmlHref) {
      html += `<a class="${cn('embedLinkIcon', 'embed-link-icon')}" href="${baseUrl}${htmlHref}" data-href="${baseUrl}${htmlHref}">\n`;
    } else {
      html += `<a class="${cn('embedLinkIcon', 'embed-link-icon')} ${cn('invalid', 'invalid')}">\n`;
    }
    html += `<i class="${cn('linkIcon', 'link-icon')}"></i>\n</a>\n</div>\n`;
    // content (filled in postprocess)
    html += `<div class="${cn('embedContent', 'embed-content')}">\n`;
    html += `<div id="${placeholderId}" class="embed-placeholder" data-filename="${filename}"${hText !== undefined ? ` data-header="${hText}"` : ''}>Loading content for '${filename}'...</div>\n`;
    html += '</div>\n';
    html += '</article>\n';
    embedPlaceholders.set(placeholderId, { filename, hText });
    return html;
  }

  return {
    async: true,
    // a single INLINE extension detects every embed (standalone or mid-text). the paragraph
    // renderer (below) hoists it out to block level. (an inline extension is safe inside code
    // spans — the codespan tokenizer consumes `![[x]]` before this can, since our tokenizer
    // only matches at index 0.)
    extensions: [
      {
        name: 'wikiembed',
        level: 'inline',
        start(src: string) {
          return src.indexOf('![[');
        },
        tokenizer(src: string) {
          const match: RegExpExecArray | null = wikirefs.RGX.WIKI.EMBED.exec(src);
          if (!match || match.length < 1 || match.index !== 0) {
            return undefined;
          }
          return {
            type: 'wikiembed',
            raw: match[0],
            filename: match[1],
            header: match[2],
            label: match[3],
          };
        },
        // fallback: an embed rendered outside a paragraph (e.g. a heading/list) still renders as
        // the block. normally the paragraph renderer intercepts and hoists it.
        renderer(token: any) {
          return renderEmbedBlock(token.filename, token.header, token.label);
        },
      },
    ],
    renderer: {
      // hoist: a paragraph containing embed token(s) is split into sibling <p>s around each
      // block embed. text runs are trimmed; empty/whitespace-only runs emit no <p> (so a
      // STANDALONE embed collapses to just the block); punctuation-only runs get their own <p>.
      paragraph(this: any, token: any): string {
        const toks: any[] = token.tokens || [];
        if (!toks.some((t: any) => t.type === 'wikiembed')) {
          return `<p>${this.parser.parseInline(toks)}</p>\n`;
        }
        let out: string = '';
        let run: any[] = [];
        const flush = (): void => {
          if (run.length > 0) {
            const inner: string = this.parser.parseInline(run).trim();
            if (inner.length > 0) { out += `<p>${inner}</p>\n`; }
            run = [];
          }
        };
        for (const t of toks) {
          if (t.type === 'wikiembed') {
            flush();
            out += renderEmbedBlock(t.filename, t.header, t.label);
          } else {
            run.push(t);
          }
        }
        flush();
        return out;
      },
    },
    hooks: {
      async postprocess(html: string) {
        if (!opts.resolveEmbedContent || embedPlaceholders.size === 0) {
          return html;
        }
        const placeholdersToProcess: Map<string, EmbedPlaceholder> = new Map(embedPlaceholders);
        let processedHtml: string = html;
        embedPlaceholders.clear();
        for (const [placeholderId, { filename, hText }] of placeholdersToProcess.entries()) {
          const placeholderRegex: RegExp = new RegExp(`<div id="${placeholderId}" class="embed-placeholder"[^>]*>[^<]*</div>`, 'g');
          const errorString: string = (opts.embeds?.errorContent || 'Error: Content not found for ') + '\'' + filename + '\'';
          if (!placeholderRegex.test(processedHtml)) {
            continue;
          }
          try {
            const embedContent: string | undefined = await opts.resolveEmbedContent(filename, hText);
            processedHtml = processedHtml.replace(placeholderRegex, () => (embedContent ? embedContent : errorString));
          } catch (error) {
            processedHtml = processedHtml.replace(placeholderRegex, () => errorString);
          }
        }
        return processedHtml;
      },
    },
  };
}
