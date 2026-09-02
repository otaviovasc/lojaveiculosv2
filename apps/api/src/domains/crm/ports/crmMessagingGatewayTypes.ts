export type CrmWhatsappTemplateParameter =
  | {
      currency: {
        amount_1000: number;
        code: string;
        fallback_value: string;
      };
      type: "currency";
    }
  | {
      date_time: {
        calendar?: "GREGORIAN" | undefined;
        day_of_month?: number | undefined;
        day_of_week?: number | undefined;
        fallback_value: string;
        hour?: number | undefined;
        minute?: number | undefined;
        month?: number | undefined;
        year?: number | undefined;
      };
      type: "date_time";
    }
  | {
      document: { id: string } | { link: string };
      type: "document";
    }
  | {
      image: { id: string } | { link: string };
      type: "image";
    }
  | { payload: string; type: "payload" }
  | { text: string; type: "text" }
  | {
      type: "video";
      video: { id: string } | { link: string };
    };

export type CrmWhatsappTemplateComponent =
  | {
      parameters: readonly CrmWhatsappTemplateParameter[];
      type: "body" | "header";
    }
  | {
      index: string;
      parameters: readonly CrmWhatsappTemplateParameter[];
      sub_type: "quick_reply" | "url";
      type: "button";
    };

export type CrmWhatsappSendTemplateInput = {
  components?: readonly CrmWhatsappTemplateComponent[];
  languageCode: string;
  name: string;
  phone: string;
};
