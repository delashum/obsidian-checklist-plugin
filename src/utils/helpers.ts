import {
  type CachedMetadata,
  parseFrontMatterTags,
  TFile,
  Vault,
} from "obsidian";

import { LOCAL_SORT_OPT } from "../constants";

import type { SortDirection, TagMeta, LinkMeta, KeysOfType } from "src/_types";
export const isMacOS = () => window.navigator.userAgent.includes("Macintosh");
export const classifyString = (str: string) => {
  const sanitizedGroupName = (str ?? "").replace(/[^A-Za-z0-9]/g, "");
  const dasherizedGroupName = sanitizedGroupName.replace(
    /^([A-Z])|[\s\._](\w)/g,
    function (_, p1, p2) {
      if (p2) return "-" + p2.toLowerCase();
      return p1.toLowerCase();
    }
  );
  return dasherizedGroupName;
};

export const removeTagFromText = (text: string, tag: string) => {
  if (!text) return "";
  if (!tag) return text.trim();
  return text.replace(new RegExp(`\\s?\\#${tag}[^\\s]*`, "g"), "").trim();
};

export const getTagMeta = (tag: string): TagMeta => {
  const tagMatch = /^\#([^\/]+)\/?(.*)?$/.exec(tag);
  if (!tagMatch) return { main: null, sub: null };
  const [full, main, sub] = tagMatch;
  return { main, sub };
};

export const retrieveTag = (tagMeta: TagMeta): string => {
  return tagMeta.main ? tagMeta.main : tagMeta.sub ? tagMeta.sub : "";
};

export const mapLinkMeta = (linkMeta: LinkMeta[]) => {
  const map = new Map<string, LinkMeta>();
  for (const link of linkMeta) map.set(link.filePath, link);
  return map;
};

export const setLineTo = (line: string, setTo: boolean) =>
  line.replace(
    /^((\s|\>)*([\-\*]|[0-9]+\.)\s\[)([^\]]+)(\].*$)/,
    `$1${setTo ? "x" : " "}$5`
  );

export const getAllLinesFromFile = (cache: string) => cache.split(/\r?\n/);
export const combineFileLines = (lines: string[]) => lines.join("\n");
export const lineIsValidTodo = (line: string) => {
  return /^(\s|\>)*([\-\*]|[0-9]+\.)\s\[(.{1})\]\s{1,4}\S+/.test(line);
};
export const extractTextFromTodoLine = (line: string) =>
  /^(\s|\>)*([\-\*]|[0-9]+\.)\s\[(.{1})\]\s{1,4}(\S{1}.*)$/.exec(line)?.[4];
export const getIndentationSpacesFromTodoLine = (line: string) =>
  /^(\s*)([\-\*]|[0-9]+\.)\s\[(.{1})\]\s{1,4}(\S+)/.exec(line)?.[1]?.length ??
  0;
export const todoLineIsChecked = (line: string) =>
  /^(\s|\>)*([\-\*]|[0-9]+\.)\s\[(\S{1})\]/.test(line);
export const getFileLabelFromName = (filename: string) =>
  /^(.+)\.md$/.exec(filename)?.[1];

export const sortGenericItemsInplace = <
  T,
  NK extends KeysOfType<T, string>,
  TK extends KeysOfType<T, number>
>(
  items: T[],
  direction: SortDirection,
  sortByNameKey: NK,
  sortByTimeKey: TK
) => {
  if (direction === "a->z")
    items.sort((a, b) =>
      (a[sortByNameKey] as any).localeCompare(
        b[sortByNameKey],
        navigator.language,
        LOCAL_SORT_OPT
      )
    );
  if (direction === "z->a")
    items.sort((a, b) =>
      (b[sortByNameKey] as any).localeCompare(
        a[sortByNameKey],
        navigator.language,
        LOCAL_SORT_OPT
      )
    );
  if (direction === "new->old")
    items.sort((a, b) => (b[sortByTimeKey] as any) - (a[sortByTimeKey] as any));
  if (direction === "old->new")
    items.sort((a, b) => (a[sortByTimeKey] as any) - (b[sortByTimeKey] as any));
};

export const ensureMdExtension = (path: string) => {
  if (!/\.md$/.test(path)) return `${path}.md`;
  return path;
};

export const getFrontmatterTags = (
  cache: CachedMetadata,
  todoTags: string[] = []
) => {
  const frontMatterTags: string[] =
    parseFrontMatterTags(cache?.frontmatter) ?? [];
  if (todoTags.length > 0)
    return frontMatterTags.filter((tag: string) =>
      todoTags.includes(getTagMeta(tag).main)
    );
  return frontMatterTags;
};

export const getAllTagsFromMetadata = (cache: CachedMetadata): string[] => {
  if (!cache) return [];
  const frontmatterTags = getFrontmatterTags(cache);
  const blockTags = (cache.tags ?? []).map((e) => e.tag);
  return [...frontmatterTags, ...blockTags];
};

export const getFileFromPath = (vault: Vault, path: string) => {
  let file = vault.getAbstractFileByPath(path);
  if (file instanceof TFile) return file;
  const files = vault.getFiles();
  file = files.find((e) => e.name === path);
  if (file instanceof TFile) return file;
};
