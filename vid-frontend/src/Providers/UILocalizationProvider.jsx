import { useEffect } from "react";
import { useSelector } from "react-redux";
import { selectLanguage } from "../redux/preferencesSlice";
import { normalizeLanguageCode } from "../i18n/languages";
import { normalizeSourceUICopy, translateUICopy } from "../i18n/uiCopyTranslations";

const textOriginals = new WeakMap();
const attributeOriginals = new WeakMap();
const TRANSLATABLE_ATTRIBUTES = ["placeholder", "title", "aria-label", "aria-placeholder", "alt"];
const IGNORED_SELECTOR = [
  "[data-no-translate]",
  "[contenteditable='true']",
  "script",
  "style",
  "noscript",
  "code",
  "pre",
  "textarea",
].join(",");
const LOOSE_UI_SELECTOR = [
  "button",
  "label",
  "option",
  "legend",
  "summary",
  "a",
  "th",
  "dt",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "[role='button']",
  "[role='menuitem']",
  "[aria-label]",
].join(",");

function isIgnored(node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return Boolean(element?.closest?.(IGNORED_SELECTOR));
}

function translateTextNode(node, language) {
  if (!node.nodeValue || isIgnored(node)) return;
  let metadata = textOriginals.get(node);
  if (!metadata) {
    metadata = {
      source: normalizeSourceUICopy(node.nodeValue),
      lastApplied: node.nodeValue,
    };
    textOriginals.set(node, metadata);
  } else if (node.nodeValue !== metadata.lastApplied && node.nodeValue !== metadata.source) {
    metadata.source = normalizeSourceUICopy(node.nodeValue);
    metadata.lastApplied = node.nodeValue;
  }
  metadata.source = normalizeSourceUICopy(metadata.source);

  if (language === "en") {
    if (node.nodeValue !== metadata.source) {
      node.nodeValue = metadata.source;
    }
    metadata.lastApplied = metadata.source;
    return;
  }

  const loose = Boolean(node.parentElement?.closest?.(LOOSE_UI_SELECTOR));
  const translated = translateUICopy(metadata.source, language, { loose });
  if (node.nodeValue !== translated) {
    node.nodeValue = translated;
  }
  metadata.lastApplied = translated;
}

function translateElementAttributes(element, language) {
  if (isIgnored(element)) return;
  let originals = attributeOriginals.get(element);
  for (const attr of TRANSLATABLE_ATTRIBUTES) {
    if (!element.hasAttribute(attr)) continue;
    if (!originals) {
      originals = {};
      attributeOriginals.set(element, originals);
    }
    if (!Object.prototype.hasOwnProperty.call(originals, attr)) {
      originals[attr] = {
        source: normalizeSourceUICopy(element.getAttribute(attr)),
        lastApplied: element.getAttribute(attr),
      };
    } else if (
      element.getAttribute(attr) !== originals[attr].lastApplied &&
      element.getAttribute(attr) !== originals[attr].source
    ) {
      originals[attr].source = normalizeSourceUICopy(element.getAttribute(attr));
      originals[attr].lastApplied = element.getAttribute(attr);
    }
    originals[attr].source = normalizeSourceUICopy(originals[attr].source);

    if (language === "en") {
      if (element.getAttribute(attr) !== originals[attr].source) {
        element.setAttribute(attr, originals[attr].source);
      }
      originals[attr].lastApplied = originals[attr].source;
      continue;
    }

    const translated = translateUICopy(originals[attr].source, language, { loose: true });
    if (element.getAttribute(attr) !== translated) {
      element.setAttribute(attr, translated);
    }
    originals[attr].lastApplied = translated;
  }
}

function translateTree(root, language) {
  if (!root || typeof document === "undefined") return;
  const lang = normalizeLanguageCode(language);
  const startNode = root.nodeType === Node.DOCUMENT_NODE ? root.body : root;
  if (!startNode) return;

  if (startNode.nodeType === Node.TEXT_NODE) {
    translateTextNode(startNode, lang);
    return;
  }

  if (startNode.nodeType === Node.ELEMENT_NODE) {
    translateElementAttributes(startNode, lang);
  }

  const walker = document.createTreeWalker(
    startNode,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        if (isIgnored(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      translateTextNode(node, lang);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      translateElementAttributes(node, lang);
    }
    node = walker.nextNode();
  }
}

export default function UILocalizationProvider({ children }) {
  const language = useSelector(selectLanguage);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;
    const lang = normalizeLanguageCode(language);
    translateTree(document, lang);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTree(mutation.target, lang);
        }
        if (mutation.type === "attributes") {
          translateTree(mutation.target, lang);
        }
        for (const node of mutation.addedNodes) {
          translateTree(node, lang);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
    });

    return () => observer.disconnect();
  }, [language]);

  return children;
}
