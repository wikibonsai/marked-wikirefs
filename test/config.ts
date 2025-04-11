import type { TestFileData } from 'wikirefs-spec';
import { fileDataMap } from 'wikirefs-spec';

import type { WikiRefsOptions } from '../src/lib/types';

// mockOpts

export function makeMockOptsForRenderOnly(): Partial<WikiRefsOptions> {
  return {
    // all
    resolveHtmlText: (filename: string): (string | undefined) => {
      const fileItem: TestFileData | undefined = fileDataMap.find((fileData: TestFileData) => fileData.filename === filename);
      return fileItem?.title?.toLowerCase();
    },
    resolveHtmlHref: (filename: string): (string | undefined) => {
      const fileItem: TestFileData | undefined = fileDataMap.find((fileData: TestFileData) => fileData.filename === filename);
      return fileItem?.href;
    },
  };
}
