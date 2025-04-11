export interface WikiRefsOptions {
  // render functions    // function declaration expectations below...
  resolveHtmlText: (fname: string) => string | undefined;
  resolveHtmlHref: (fname: string) => string | undefined;
  resolveDocType?: (fname: string) => string | undefined;
  // embed-only
  resolveEmbedContent?: (fname: string) => Promise<string | undefined>;
  // metadata functions
  addAttr?: (attrType: string, fname: string) => void;
  addLink?: (linkType: string, fname: string) => void;
  addEmbed?: (fname: string) => void;
  // render opts
  prepFile?: boolean;
  baseUrl?: string;
  cssNames?: {
    // wiki
    wiki?: string;
    invalid?: string;
    // kinds
    attr?: string;
    link?: string;
    type?: string;
    embed?: string;
    reftype?: string;
    doctype?: string;
    // attr
    attrbox?: string;
    attrboxTitle?: string;
    // embed
    embedWrapper?: string;
    embedTitle?: string;
    embedLink?: string;
    embedContent?: string;
    embedLinkIcon?: string;
    linkIcon?: string;
    embedMedia?: string;
    embedAudio?: string;
    embedDoc?: string;
    embedImage?: string;
    embedVideo?: string;
  };
  attrs?: {
    enable?: boolean;
    render?: boolean;
    title?: string;
  };
  links?: {
    enable?: boolean;
  };
  embeds?: {
    enable?: boolean;
    title?: string;
    errorContent?: string;
  };
}

export interface AttributeCollection {
  [attrtype: string]: string[];
}

// Add this interface to extend Marked's types
declare module 'marked' {
  interface Lexer {
    nested: boolean;
  }
}
