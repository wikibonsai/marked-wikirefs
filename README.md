# marked-wikirefs

[![A WikiBonsai Project](https://img.shields.io/badge/%F0%9F%8E%8B-A%20WikiBonsai%20Project-brightgreen)](https://github.com/wikibonsai/wikibonsai)
[![NPM package](https://img.shields.io/npm/v/marked-wikirefs)](https://npmjs.org/package/marked-wikirefs)

A marked plugin to process [[[wikirefs]]](https://github.com/wikibonsai/wikirefs)

Note that this plugin only parses the input -- it is up to you to assign appropriate linking information and/or index relationships (between files).

🕸 Weave a semantic web in your [🎋 WikiBonsai](https://github.com/wikibonsai/wikibonsai) digital garden.

## Install

Install with [npm](https://docs.npmjs.com/cli/v9/commands/npm-install):

```
$ npm install marked-wikirefs
```

## Use

```js
import { marked } from 'marked';
import * as wikirefs from 'wikirefs';
import wikirefsExtension from 'marked-wikirefs';

const options = {
  resolveHtmlHref: (fname) => {
    const extname = wikirefs.isMedia(fname) ? fname.slice(fname.lastIndexOf('.')) : '';
    fname = fname.replace(extname, '');
    return '/' + fname.trim().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + extname;
  },
  resolveHtmlText: (fname) => fname.replace(/-/g, ' '),
  resolveEmbedContent: async (fname, hText) => {
    // Can be async; hText is optional (for ![[file#section]])
    const content = await fetchContent(fname, hText);
    return content;
  },
};

// Add the wikirefs extension to marked
marked.use(wikirefsExtension(options));

// Now parse markdown with wikirefs
const html = await marked.parse('[[wikilink]]');
```

Require style imports work as well:

```js
const wikirefs = require('marked-wikirefs');

// if you encounter issues, try:
const wikirefs = require('markded-wikirefs').default;
```

## Syntax

For syntax specifications, see the [wikirefs-spec](https://github.com/wikibonsai/wikirefs/tree/main/spec) repo.

### Header / fragment support

Wikilinks and wikiembeds support an optional **header** (fragment) so you can link or embed a specific section:

- **Wikilinks:** `[[file#section]]` or `[[file#Section Title]]` — the link href gets a `#section-slug` fragment appended; display text is the label (if any), else the resolved title.
- **Wikiembeds:** `![[file#section]]` — the embed title/link use the same href with fragment; `resolveEmbedContent(fname, hText)` is called so you can return only that section’s content.

## Option recommendations

For render output:
- `resolveHtmlText`
- `resolveHtmlHref`
- `resolveEmbedContent`

For `wikiembeds` -- note:
- The file extension is used to identify how the embed should be formatted (audio, image, video, or markdown).
- Embeds are rendered in two phases: the initial pass injects placeholder divs; the async `postprocess` hook then calls `resolveEmbedContent` and replaces each placeholder with the resolved content. Handle self-references and cycles when re-using the same marked instance to render that content.
- For section embeds (`![[file#section]]`), `resolveEmbedContent(fname, hText)` receives the optional `hText` so you can return only that section’s HTML.

For metadata population:
- `addAttr`
- `addLink`
- `addEmbed`
- `prepFile` (useful for clearing a cache for the current markdown file per render)

## Options

### `addAttr: (attrtype: string, fname: string) => void`

Called when a wikiattr references a file; use for metadata or indexing.

### `addLink: (linktype: string, fname: string) => void`

Called when a wikilink is rendered; use for metadata or indexing.

### `addEmbed: (fname: string) => void`

Called when a wikiembed is rendered; use for metadata or indexing.

### `attrs`

These are options wikiattrs-specific options.

If `markdown-it-wikirefs` is being used in conjunction with `markdown-it-caml`, `attrs` options may be set in `markdown-it-caml` and will apply to `markdown-it-wikirefs` as well.

#### `attrs.enable`

A boolean property that toggles parsing and rendering wikiattrs on/off.

#### `attrs.render`

A boolean property that toggles rendering wikiattrs on/off. This is useful in the scenario where wikiattrs are used for metadata and not for display purposes; like a yaml-stand-in.

#### `attrs.title`

A string to be rendered in the wikiattrs' attrbox.

### `baseUrl`

A base url that is applied to all urls internally.

### `cssNames`

CSS classnames may be overridden here.

#### `cssNames.attr`

Classname for wikiattrs. Default is `attr`.

#### `cssNames.link`

Classname for wikilinks. Default is `link`.

#### `cssNames.type`

Classname for typed wikilinks. Default is `type`.

#### `cssNames.wiki`

Classname for valid wikirefs. Default is `wiki`.

#### `cssNames.invalid`

Classname for invalid wikirefs. Default is `invalid`.


#### `cssNames.reftype`

Classname for wikiref type. Default is `reftype__` and combined with the slugified form of the user-defined reftype.

#### `cssNames.doctype`

Classname for document type. Default is `doctype__` and combined with the slugified form of the user-defined doctype.

#### `cssNames.attrbox`

Classname for the wikiattr attrbox. Default is `attrbox`.

### `links`

These are wikilinks-specific options.

#### `links.enable`

A boolean property that toggles parsing/rendering wikilinks on/off.

### `prepFile: () => void`

### `resolveDocType: (fname: string) => string | undefined`

Returns the document type for a file (used for CSS classes). Receives the filename; return `undefined` if there is no type.

### `resolveEmbedContent?: (fname: string, hText?: string | undefined) => Promise<string | undefined>`

Invoked for each wikiembed (`![[fname]]` or `![[fname#section]]`) during the async postprocess hook. Returns the HTML to replace the embed placeholder with.

- **`fname`** — the embed target filename (no fragment).
- **`hText`** — optional section/fragment when the user wrote `![[fname#section]]`; you can return only that section’s content. Omit or ignore to return the full document.

Be sure to handle self-references and cycles when re-using the same marked instance to render embedded content.

### `resolveHtmlHref: (fname: string) => string | undefined`

Returns the URL for a wikilink or wikiembed target. Receives only the **filename** (no `#fragment`); the extension appends the fragment when the user wrote `[[fname#section]]` or `![[fname#section]]`. Return `undefined` if the file doesn’t exist (the ref will render as invalid).

Default: `'/' + fname.trim().toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')`.

### `resolveHtmlText: (fname: string) => string | undefined`

Returns the display text for a wikilink or wikiembed (e.g. the document title). Receives the **filename** only. If the user provided a label (`[[fname|label]]`), the label is used instead of this. Return `undefined` to fall back to the filename.

Default: `fname.replace(/-/g, ' ')`.
