import type {
  SectionCopy,
  SectionSpec,
  StorefrontTokens,
} from "../config/types";
import type { PublicStorefrontPageData } from "../types";

export type StorefrontSectionProps = {
  copy: SectionCopy;
  data: PublicStorefrontPageData;
  onOpenListing: (listingSlug: string) => void;
  sections: readonly SectionSpec[];
  spec: SectionSpec;
  tokens: StorefrontTokens;
};
