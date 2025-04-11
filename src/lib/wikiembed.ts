import type { MarkedExtension } from 'marked';
import path from 'path';
import * as wikirefs from 'wikirefs';


export function wikiembeds(opts: any = {}): MarkedExtension {
  // track placeholders we need to process
  const embedPlaceholders: Map<string, string> = new Map();
  
  return {
    async: true,
    extensions: [
      {
        name: 'wikiembeds',
        level: 'inline',
        start(src: string) {
          const match = wikirefs.RGX.WIKI.EMBED.exec(src);
          return match ? 0 : -1;
        },
        tokenizer(src: string) {
          const match: RegExpExecArray | null = wikirefs.RGX.WIKI.EMBED.exec(src);
          if (!match || match.length < 1 || match.index !== 0) {
            return undefined;
          }
          const matchText: string = match[0];
          const filenameText: string = match[1];
          return {
            type: 'wikiembeds',
            raw: matchText,
            filename: filenameText
          };
        },
        renderer(token: any) {
          const filename: string = token.filename;
          const cssNames: any = opts.cssNames || {};
          const htmlHref: string | undefined = opts.resolveHtmlHref ? opts.resolveHtmlHref(filename) : '/' + filename;
          const htmlText: string | undefined = (opts.resolveHtmlText && opts.resolveHtmlText(filename)) ? opts.resolveHtmlText(filename) : filename;
          const doctype: string | undefined = opts.resolveDocType  ? opts.resolveDocType(filename) : '';
          // Handle media embeds (audio, image, video)
          if (wikirefs.isMedia(filename)) {
            const filenameSlug: string = filename.trim().toLowerCase().replace(/ /g, '-');
            const mediaExt: string = path.extname(filename).toLowerCase();
            const mime: string = path.extname(filename).replace('.', '').toLowerCase();
            let html: string = `<p>\n<span class="${cssNames.embedMedia || 'embed-media'}" src="${filenameSlug}" alt="${filenameSlug}">\n`;
            if (wikirefs.CONST.EXTS.AUD.has(mediaExt)) {
              html += htmlHref ?
                `<audio class="${cssNames.embedAudio || 'embed-audio'}" controls type="audio/${mime}" src="${htmlHref}"></audio>\n` :
                `<audio class="${cssNames.embedAudio || 'embed-audio'}" controls type="audio/${mime}"></audio>\n`;
            } else if (wikirefs.CONST.EXTS.IMG.has(mediaExt)) {
              html += htmlHref ?
                `<img class="${cssNames.embedImage || 'embed-image'}" src="${htmlHref}">\n` :
                `<img class="${cssNames.embedImage || 'embed-image'}">\n`;
            } else if (wikirefs.CONST.EXTS.VID.has(mediaExt)) {
              html += htmlHref ?
                `<video class="${cssNames.embedVideo || 'embed-video'}" controls type="video/${mime}" src="${htmlHref}"></video>\n` :
                `<video class="${cssNames.embedVideo || 'embed-video'}" controls type="video/${mime}"></video>\n`;
            } else {
              // note: we should never get here
              html += 'media error\n';
            }
            html += '</span>\n</p>\n';
            // add metadata
            if (opts.addEmbed) {
              opts.addEmbed(filename);
            }
            return html;
          // Handle markdown embeds
          } else {
            // Create a unique ID for this placeholder
            const placeholderId: string = `embed-${Math.random().toString(36).substring(2, 15)}`;
            let html: string = `<p>\n<div class="${cssNames.embedWrapper || 'embed-wrapper'}">\n`;
            // Title
            html += `<div class="${cssNames.embedTitle || 'embed-title'}">\n`;
            if (htmlHref) {
              // Build CSS classes
              const cssClassArray: string[] = [];
              cssClassArray.push(cssNames.wiki || 'wiki');
              cssClassArray.push(cssNames.embed || 'embed');
              if (doctype) {
                const docTypeSlug: string = doctype.trim().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                cssClassArray.push((cssNames.doctype || 'doctype__') + docTypeSlug);
              }
              const css: string = cssClassArray.join(' ');
              html += `<a class="${css}" href="${opts.baseUrl || ''}${htmlHref}" data-href="${opts.baseUrl || ''}${htmlHref}">\n${htmlText}\n</a>\n`;
            } else {
              html += `<a class="${cssNames.wiki || 'wiki'} ${cssNames.embed || 'embed'} ${cssNames.invalid || 'invalid'}">\n${htmlText}\n</a>\n`;
            }
            html += '</div>\n';
            // Link
            html += `<div class="${cssNames.embedLink || 'embed-link'}">\n`;
            if (htmlHref) {
              html += `<a class="${cssNames.embedLinkIcon || 'embed-link-icon'}" href="${opts.baseUrl || ''}${htmlHref}" data-href="${opts.baseUrl || ''}${htmlHref}">\n`;
            } else {
              html += `<a class="${cssNames.embedLinkIcon || 'embed-link-icon'} ${cssNames.invalid || 'invalid'}">\n`;
            }
            html += `<i class="${cssNames.linkIcon || 'link-icon'}"></i>\n</a>\n</div>\n`;
            // Content
            html += `<div class="${cssNames.embedContent || 'embed-content'}">\n`;
            html += `<div id="${placeholderId}" class="embed-placeholder" data-filename="${filename}">Loading content for '${filename}'...</div>\n`;
            html += '</div>\n';
            html += '</div>\n</p>\n';
            // Register this placeholder for processing
            embedPlaceholders.set(placeholderId, filename);
            // Add metadata if needed
            if (opts.addEmbed) {
              opts.addEmbed(filename);
            }
            return html;
          }
        }
      }
    ],
    hooks: {
      async postprocess(html) {
        // Skip if no placeholders or no resolveEmbedContent function
        if (!opts.resolveEmbedContent || embedPlaceholders.size === 0) {
          return html;
        }
        // Make a copy to avoid modifying the Map while iterating
        const placeholdersToProcess: Map<string, string> = new Map(embedPlaceholders);
        let processedHtml: string = html;
        // Clear the global placeholders map before processing
        embedPlaceholders.clear();
        // Process each placeholder
        for (const [placeholderId, filename] of placeholdersToProcess.entries()) {
          // Much more specific regex that exactly matches only our placeholder
          const placeholderRegex: RegExp = new RegExp(`<div id="${placeholderId}" class="embed-placeholder"[^>]*>[^<]*</div>`, 'g');
          const errorString: string = (opts.embeds?.errorContent || 'Error: Content not found for ') + '\'' + filename + '\'';
          // Check if the pattern still exists in the HTML
          if (!placeholderRegex.test(processedHtml)) {
            console.debug(`Placeholder ${placeholderId} not found in HTML`);
            continue;
          }
          try {
            const embedContent: string | undefined = await opts.resolveEmbedContent(filename);
            if (embedContent) {
              // Replace only the exact placeholder, not any potential content with similar structure
              processedHtml = processedHtml.replace(placeholderRegex, () => embedContent);
            } else {
              processedHtml = processedHtml.replace(placeholderRegex, () => errorString);
            }
          } catch (error) {
            console.error(`Error resolving embed content for ${filename}:`, error);
            processedHtml = processedHtml.replace(placeholderRegex, () => errorString);
          }
        }
        return processedHtml;
      }
    }
  };
} 