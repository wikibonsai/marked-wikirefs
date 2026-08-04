import type { MarkedExtension } from 'marked';
import { defu } from 'defu';
import * as wikirefs from 'wikirefs';

import type { WikiRefsOptions } from './lib/types';
import { wikiattrs } from './lib/wikiattr';
import { wikilinks } from './lib/wikilink';
import { wikiembeds } from './lib/wikiembed';


export default function wikirefsExtension(opts: Partial<WikiRefsOptions> = {}): MarkedExtension {
  // defaults
  const defaults: WikiRefsOptions = {
    resolveHtmlText: (fname: string) => fname.replace(/-/g, ' '),
    resolveHtmlHref: (fname: string) => {
      const extname: string = wikirefs.isMedia(fname) ? fname.slice(fname.lastIndexOf('.')) : '';
      fname = fname.replace(extname, '');
      return '/' + wikirefs.slugify(fname) + extname;
    },
    resolveEmbedContent: (fname: string, _hText?: string | undefined) => Promise.resolve(fname + ' content'),
    baseUrl: '',
    cssNames: {
      // wiki
      wiki: 'wiki',
      invalid: 'invalid',
      // kinds
      attr: 'attr',
      link: 'link',
      type: 'type',
      embed: 'embed',
      reftype: 'reftype__',
      doctype: 'doctype__',
      // attr
      attrbox: 'attrbox',
      attrItem: 'attr-item',
      // embed
      embedWrapper: 'embed-wrapper',
      embedTitle: 'embed-title',
      embedLink: 'embed-link',
      embedContent: 'embed-content',
      embedLinkIcon: 'embed-link-icon',
      linkIcon: 'link-icon',
      embedMedia: 'embed-media',
      embedAudio: 'embed-audio',
      embedImage: 'embed-image',
      embedPDF: 'embed-pdf',
      embedVideo: 'embed-video',
    },
    attrs: {
      enable: true,
      render: true,
      title: 'Attributes',
    },
    links: {
      enable: true,
    },
    embeds: {
      enable: true,
      title: 'Embed Content',
      errorContent: 'Error: Content not found for ',
    }
  };
  // defu(source, ...defaults): source (user opts) wins, defaults fill gaps —
  // same precedence as the old merge({}, defaults, opts), but non-mutating and
  // with an explicit __proto__/constructor guard (drops the lodash dep).
  const fullOpts: WikiRefsOptions = defu(opts, defaults) as WikiRefsOptions;
  // merge extensions
  const extension: MarkedExtension = {
    extensions: [],
    async: true
  };
  const preprocessHooks: Array<(text: string) => string | Promise<string>> = [];
  const postprocessHooks: Array<(html: string) => string | Promise<string>> = [];
  // wikiattrs
  if (fullOpts.attrs && fullOpts.attrs.enable) {
    const attrsExt = wikiattrs(fullOpts);
    if (extension.extensions && attrsExt.extensions) {
      extension.extensions = extension.extensions.concat(attrsExt.extensions);
    }
    // Add hooks - only if the extension is enabled
    if (attrsExt.hooks) {
      if (attrsExt.hooks.preprocess) preprocessHooks.push(attrsExt.hooks.preprocess);
      if (attrsExt.hooks.postprocess) postprocessHooks.push(attrsExt.hooks.postprocess);
    }
  }
  // wikilinks
  if (fullOpts.links && fullOpts.links.enable) {
    const linksExt = wikilinks(fullOpts);
    if (extension.extensions && linksExt.extensions) {
      extension.extensions = extension.extensions.concat(linksExt.extensions);
    }
    // Add hooks - only if the extension is enabled
    if (linksExt.hooks) {
      if (linksExt.hooks.preprocess) preprocessHooks.push(linksExt.hooks.preprocess);
      if (linksExt.hooks.postprocess) postprocessHooks.push(linksExt.hooks.postprocess);
    }
  }
  // wikiembeds
  if (fullOpts.embeds && fullOpts.embeds.enable) {
    const embedsExt = wikiembeds(fullOpts);
    if (extension.extensions && embedsExt.extensions) {
      extension.extensions = extension.extensions.concat(embedsExt.extensions);
    }
    // Add hooks - only if the extension is enabled
    if (embedsExt.hooks) {
      if (embedsExt.hooks.preprocess) preprocessHooks.push(embedsExt.hooks.preprocess);
      if (embedsExt.hooks.postprocess) postprocessHooks.push(embedsExt.hooks.postprocess);
    }
    // Add renderer overrides (e.g. wikiembeds' paragraph hoist)
    if (embedsExt.renderer) { extension.renderer = { ...(extension.renderer || {}), ...embedsExt.renderer }; }
  }
  extension.hooks = {
    async preprocess(markdown: string): Promise<string> {
      let result = markdown;
      for (const hook of preprocessHooks) {
        const output = hook(result);
        if (output instanceof Promise) {
          result = await output;
        } else {
          result = output;
        }
      }
      return result;
    },
    async postprocess(html: string): Promise<string> {
      let result = html;
      for (const hook of postprocessHooks) {
        const output = hook(result);
        if (output instanceof Promise) {
          result = await output;
        } else {
          result = output;
        }
      }
      return result;
    }
  };
  return extension;
}
