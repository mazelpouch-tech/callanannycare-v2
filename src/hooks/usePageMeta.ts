import { useEffect } from "react";

interface PageMetaOptions {
  title: string;
  description: string;
  canonicalPath?: string;
}

const DEFAULT_TITLE = "call a nanny - Professional Childcare Services";
const DEFAULT_DESCRIPTION =
  "call a nanny - Professional, trusted childcare services. Book a vetted nanny for your family today.";
const BASE_URL = "https://callanannycare.vercel.app";

export function usePageMeta({ title, description, canonicalPath }: PageMetaOptions) {
  useEffect(() => {
    // Set title
    const prevTitle = document.title;
    document.title = title;

    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute("content") || "";
    if (metaDesc) {
      metaDesc.setAttribute("content", description);
    } else {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      metaDesc.setAttribute("content", description);
      document.head.appendChild(metaDesc);
    }

    // Set canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonicalPath) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", `${BASE_URL}${canonicalPath}`);
    }

    // Cleanup
    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute("content", prevDesc || DEFAULT_DESCRIPTION);
      if (canonical && canonicalPath) canonical.remove();
    };
  }, [title, description, canonicalPath]);
}

export function useJsonLd(schema: Record<string, unknown>) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);
}
