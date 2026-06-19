import type { MarkedExtension } from 'marked';

import * as wikirefs from 'wikirefs';
import type { WikiRefsOptions, AttributeCollection } from './types';


export function wikiattrs(opts: WikiRefsOptions): MarkedExtension {
  
  const attributeCollection: AttributeCollection = {};
  // helpers

  function addToCollection(attrtype: string, filename: string): void {
    if (!attributeCollection[attrtype]) {
      attributeCollection[attrtype] = [];
    }
    attributeCollection[attrtype].push(filename);
    // add metadata
    if (opts.addAttr) {
      opts.addAttr(attrtype, filename);
    }
  }

  // note: not the actual renderer -- wikiattrs are rendered in postprocessing
  function renderAttributeBox(): string {
    if (Object.keys(attributeCollection).length === 0) {
      return '';
    }

    const cssNames: any = opts.cssNames || {};
    let attrboxHtml: string = `<aside class="${cssNames.attrbox || 'attrbox'}">\n`;
    attrboxHtml += '<dl>\n';

    // Render each attribute type and its values
    for (const attrType in attributeCollection) {
      attrboxHtml += '<div class="attr-item">\n';
      attrboxHtml += `<dt>${attrType}</dt>\n`;

      for (const filename of attributeCollection[attrType]) {
        const htmlHref: string | undefined = opts.resolveHtmlHref(filename);
        const htmlText: string | undefined = opts.resolveHtmlText(filename) ? opts.resolveHtmlText(filename) : filename;
        const doctype : string | undefined = opts.resolveDocType ? opts.resolveDocType(filename) : '';
        // invalid
        if (htmlHref === undefined) {
          const wikitext = filename || 'error';
          attrboxHtml += `<dd><a class="${cssNames.attr || 'attr'} ${cssNames.wiki || 'wiki'} ${cssNames.invalid || 'invalid'}">[[${wikitext}]]</a></dd>\n`;

        // valid
        } else {
          const cssClassArray: string[] = [];
          if (attrType) {
            cssClassArray.push(cssNames.attr || 'attr');
          }
          cssClassArray.push(cssNames.wiki || 'wiki');
          if (attrType) {
            const attrTypeSlug = attrType.trim().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
            cssClassArray.push((cssNames.reftype || 'reftype__') + attrTypeSlug);
          }
          if (doctype) {
            const docTypeSlug = doctype.trim().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
            cssClassArray.push((cssNames.doctype || 'doctype__') + docTypeSlug);
          }
          const css: string = cssClassArray.join(' ');
          attrboxHtml += `<dd><a class="${css}" href="${opts.baseUrl || ''}${htmlHref}" data-href="${opts.baseUrl || ''}${htmlHref}">${htmlText}</a></dd>\n`;
        }
      }
      attrboxHtml += '</div>\n';
    }

    attrboxHtml += '</dl>\n</aside>\n';
    return attrboxHtml;
  }

  /**
   * Checks if a matched text is in a valid context for wiki attributes
   * (top of the document: not inside a list item, blockquote, code block, etc.)
   */
  function isTop(content: string, position: number, matchedText: string): boolean {
    // If position is invalid, return false
    if (position < 0 || position >= content.length) {
      return false;
    }

    // Get the first line of the matched text (this is what we check for context patterns)
    const firstLine: string = matchedText.split('\n')[0];

    // Check for invalid contexts in the first line

    // Bullet list item (- * +)
    if (/^ *[-*+]\s/.test(firstLine)) {
      return false;
    }

    // Numbered list item (1. 2. etc)
    if (/^ *\d+[.)]\s/.test(firstLine)) {
      return false;
    }

    // Blockquote
    if (/^ *>\s/.test(firstLine)) {
      return false;
    }

    // Indented code block (4+ spaces or tab)
    if (/^ {4,}|\t/.test(firstLine)) {
      return false;
    }

    // Fenced code block (```)
    if (content.includes('```')) {
      const codeFenceStr = '```'; // Simplify for reliability
      const beforeMatch = content.substring(0, position).lastIndexOf(codeFenceStr);
      if (beforeMatch >= 0) {
        const afterMatch = content.indexOf(codeFenceStr, position);
        // If we found an opening ``` before and a closing ``` after
        if (afterMatch > position) {
          // Simple check: odd number of ``` before position means we're in a code block
          const blockMarkers = (content.substring(0, position).match(/```/g) || []).length;
          if (blockMarkers % 2 !== 0) {
            return false;
          }
        }
      }
    }

    // Code span (inline code with backticks)
    if (content.includes('`')) {
      const charsBeforePosition = content.substring(0, position);
      const backticksBefore = (charsBeforePosition.match(/`/g) || []).length;
      const charsAfterPosition = content.substring(position);
      const backticksAfter = (charsAfterPosition.match(/`/g) || []).length;
      
      // If we have an odd number before and at least one after, we're in a code span
      if (backticksBefore % 2 !== 0 && backticksAfter > 0) {
        return false;
      }
    }

    return true;
  }

  return {
    extensions: [], // no tokenizers
    hooks: {
      preprocess(markdown: string) {
        // Clear the attribute collection
        Object.keys(attributeCollection).forEach(key => {
          delete attributeCollection[key];
        });

        // Find all wikiattrs
        const attrMatches = wikirefs.RGX.WIKI.ATTR(markdown);
        let modified: string = markdown;
        const replacements: any[] = [];

        // Collect attributes and identify invalid contexts
        for (const am of attrMatches) {
          if (isTop(markdown, am.start, am.text)) {
            // valid context - process for attribute collection
            const attrtype: string = am.type[0].trim();
            for (const [filename] of am.filenames) {
              addToCollection(attrtype, filename);
            }

            // We don't want this to render in the document, so we'll replace it
            const matchText: string = am.text;
            const start: number = am.start;
            replacements.push({
              start: start,
              end: start + matchText.length,
              original: matchText,
              replacement: '' // Replace with empty string
            });
          } else {
            // For invalid contexts, we won't modify the content at all
            // This lets it be processed normally (e.g., as code, blockquote, etc.)
            // No escaping needed - just leave it as is
          }
        }
        // Apply replacements in reverse order to not mess up positions
        replacements.sort((a, b) => b.start - a.start);

        for (const r of replacements) {
          modified = 
            modified.substring(0, r.start) + 
            r.replacement + 
            modified.substring(r.end);
        }

        return modified;
      },

      postprocess(html) {
        // Render attribute box
        const attrboxHtml: string = renderAttributeBox();
        const hasAttrbox: boolean = html.includes(`class="${opts.cssNames?.attrbox || 'attrbox'}"`);
        const doRender: boolean = !!(opts.attrs && opts.attrs.render !== false);

        const result: string = (doRender && attrboxHtml && !hasAttrbox)
          ? attrboxHtml + html
          : html;

        // Clear collection after use so state does not leak between parses/tests
        Object.keys(attributeCollection).forEach((key) => {
          delete attributeCollection[key];
        });

        return result;
      }
    }
  };
}

