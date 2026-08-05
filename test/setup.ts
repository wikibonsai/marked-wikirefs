import { defu } from 'defu';
import { Marked } from 'marked';
import markedFootnote from 'marked-footnote';

import * as wikirefs from 'wikirefs';
import wikirefsExtension from '../src';
import type { WikiRefsOptions } from '../src/lib/types';

import type { TestFileData } from 'wikirefs-spec';
import { fileDataMap, makeMockOptsForRenderOnly } from 'wikirefs-spec';


// shared render-test setup. wikirefs stands alone here — caml is not co-registered
// (caml + wikirefs interop is tested from the caml side, in marked-caml). the embed
// resolver, expected-html overrides, and run() helper live here.

export type MdFn = ((src: string) => Promise<string>) & { parse: (src: string, opt?: unknown) => Promise<string> };

// build a marked pipeline. async (wikirefs' embed hook). the embed resolver recursively
// renders fixture content w/ cycle detection + header extraction. `extraOpts` layers a
// per-case opts override ON TOP of the render-only mock base (defu: extraOpts wins), so
// config cases can flip toggles / swap resolvers / rename css classes off one shared base.
export function buildMd(extraOpts: Partial<WikiRefsOptions> = {}): MdFn {
  let cycleStack: string[] = [];
  // eslint-disable-next-line prefer-const -- forward-referenced by the embed resolver closure below, assigned after the pipeline is built
  let md: MdFn;
  const mockOpts: Partial<WikiRefsOptions> = {
    ...makeMockOptsForRenderOnly(),
    // note: it ain't pretty, but it gets the job done...
    resolveEmbedContent: async function(filename: string, hText?: string | undefined): Promise<string | undefined> {
      // markdown-only
      if (wikirefs.isMedia(filename)) { return; }
      // cycle detection
      if (!cycleStack) {
        cycleStack = [];
      } else {
        if (cycleStack.includes(filename)) {
          cycleStack = [];
          return 'cycle detected';
        }
      }
      cycleStack.push(filename);
      // get content
      const fakeFile: TestFileData | undefined = fileDataMap.find((fileData: TestFileData) => fileData.filename === filename);
      let mkdnContent: string | undefined = fakeFile ? fakeFile.content : undefined;
      // section extraction via header
      if (mkdnContent && hText && hText.trim().length > 0) {
        const section: string | undefined = wikirefs.getHeaderSection(mkdnContent, hText);
        if (section !== undefined) {
          mkdnContent = section;
        } else {
          cycleStack = [];
          return (mockOpts.embeds?.errorContent || 'Error: Content not found for ') + '\'' + filename + '\'';
        }
      }
      let htmlContent: string | undefined;
      if (mkdnContent === undefined) {
        htmlContent = undefined;
      } else if (mkdnContent.length === 0) {
        htmlContent = '';
      } else {
        htmlContent = await md.parse(mkdnContent);
      }
      cycleStack = [];
      return htmlContent;
    },
  };
  // a fresh Marked instance so hooks are not accumulated across builds (a marked
  // singleton would chain preprocess/postprocess on each rebuild).
  const instance: Marked = new Marked();
  instance.setOptions({ gfm: true, async: true });
  instance.use(markedFootnote());
  instance.use(wikirefsExtension(defu(extraOpts, mockOpts)));
  md = ((src: string, opt?: unknown) => instance.parse(src, opt as never)) as MdFn;
  md.parse = (src: string, opt?: unknown) => instance.parse(src, opt as never);
  return md;
}
