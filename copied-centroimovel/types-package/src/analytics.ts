import { z } from "zod";

export const AnalyticsEventTypeSchema = z.enum([
  "PAGE_VIEW",
  "PROPERTY_VIEW",
  "CONTACT_CLICK_WHATSAPP",
  "CONTACT_CLICK_PHONE",
  "CONTACT_CLICK_EMAIL",
  "FORM_SUBMIT",
  "DEAL_CLOSED",
]);
export type AnalyticsEventType = z.infer<typeof AnalyticsEventTypeSchema>;

export const UtmParamsSchema = z.object({
  utmSource: z.string().optional().nullable(),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
  utmTerm: z.string().optional().nullable(),
  utmContent: z.string().optional().nullable(),
});
export type UtmParams = z.infer<typeof UtmParamsSchema>;

export const TrackEventSchema = z.object({
  type: AnalyticsEventTypeSchema,
  path: z.string(),
  propertyId: z.string().optional().nullable(),
  referrer: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  visitorId: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
  utmSource: z.string().optional().nullable(),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
  utmTerm: z.string().optional().nullable(),
  utmContent: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});
export type TrackEvent = z.infer<typeof TrackEventSchema>;

export const DateRangeSchema = z.enum(["7d", "30d", "90d", "custom"]);
export type DateRange = z.infer<typeof DateRangeSchema>;

export const AnalyticsFilterSchema = z.object({
  range: DateRangeSchema.default("30d"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type AnalyticsFilter = z.infer<typeof AnalyticsFilterSchema>;

// Dashboard Analytics Data types
export interface TimeSeriesPoint {
  date: string;
  views: number;
  leads: number;
}

export interface UtmCampaign {
  campaign: string | null;
  source: string | null;
  medium: string | null;
  visits: number;
  leads: number;
  deals: number;
}

export interface FunnelData {
  pageViews: number;
  propertyViews: number;
  contactClicks: number;
  formSubmissions: number;
  dealsClosed: number;
}

export interface TopProperty {
  id: string;
  title: string;
  views: number;
  leads: number;
  contactClicks: number;
}

export interface AnalyticsData {
  overview: {
    totalViews: number;
    totalLeads: number;
    conversionRate: number;
    totalDeals: number;
    viewsChange: number;
    leadsChange: number;
    conversionChange: number;
    dealRate: number;
  };
  engagement: {
    avgTimeOnPage: number;
    avgScrollDepth: number;
    totalInteractions: number;
    bounceRate: number;
  };
  timeSeries: Array<{
    date: string;
    views: number;
    leads: number;
    avgTimeOnPage: number;
  }>;
  scrollDepth: {
    depth25: number;
    depth50: number;
    depth75: number;
    depth90: number;
    depth100: number;
  };
  timeDistribution: {
    lessThan10s: number;
    between10sAnd30s: number;
    between30sAnd1m: number;
    between1mAnd2m: number;
    between2mAnd5m: number;
    moreThan5m: number;
  };
  photoGallery: {
    totalOpens: number;
    avgPhotosViewed: number;
    avgTimeInGallery: number;
    totalPhotoViews: number;
  };
  videoStats: {
    totalPlays: number;
    avgWatchTime: number;
    completionRate: number;
    twentyFivePercentViews: number;
    fiftyPercentViews: number;
    seventyFivePercentViews: number;
  };
  contactMethods: {
    whatsapp: number;
    phone: number;
    email: number;
    form: number;
  };
  hourlyActivity: Array<{
    hour: number;
    views: number;
    leads: number;
  }>;
  utmPerformance: Array<{
    campaign: string | null;
    source: string | null;
    medium: string | null;
    visits: number;
    leads: number;
    deals: number;
    conversionRate: number;
    trend: "up" | "down" | "stable";
  }>;
  funnelData: FunnelData;
  topProperties: Array<{
    id: string;
    title: string;
    views: number;
    leads: number;
    attributedLeads: number;
    contactClicks: number;
    conversionRate: number;
    trend: number;
    image?: string;
    neighborhood?: string | null;
    city?: string | null;
  }>;
  geoData: {
    topStates: Array<{
      code: string;
      name: string;
      leads: number;
      visitors: number;
      conversionRate: number;
    }>;
    topCities: Array<{
      name: string;
      state: string;
      leads: number;
      visitors: number;
      lat: number;
      lng: number;
      conversionRate: number;
    }>;
  };
  heatmapData?: {
    clicks: Array<{ x: number; y: number; count: number }>;
    scroll: Array<{ percentage: number; users: number; time: number }>;
  };
  behaviorInsights?: {
    topPagesByInteractions: Array<{
      path: string;
      interactions: number;
      avgScrollDepth: number;
    }>;
    topActions: Array<{
      action: string;
      count: number;
    }>;
    clickHeatmapByPage: Array<{
      path: string;
      bins: Array<{
        xBin: number;
        yBin: number;
        count: number;
      }>;
      maxCount: number;
    }>;
    scrollCurveByPage: Array<{
      path: string;
      points: Array<{
        depthPercent: number;
        users: number;
        avgTimeSeconds: number;
      }>;
    }>;
  };
  realtimeQueue?: number;
}

// Geographic types for dashboard
export interface GeoStateStats {
  stateCode: string;
  stateName: string;
  leads: number;
  visitors: number;
  conversionRate: number;
}

export interface GeoCityStats {
  cityName: string;
  stateCode: string;
  stateName: string | null;
  leads: number;
  visitors: number;
  conversionRate: number;
  latitude: number | null;
  longitude: number | null;
}
