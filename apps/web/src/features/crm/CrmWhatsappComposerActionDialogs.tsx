import { MapPin } from "lucide-react";
import { useState } from "react";
import { ActionDialog } from "./CrmWhatsappActionDialogFrame";
import type { CrmWhatsappSendLocationInput } from "./crmWhatsappTypes";

export type LocationDialogSend = (
  input: Omit<CrmWhatsappSendLocationInput, "sessionId">,
) => Promise<boolean>;

export function LocationDialog({
  defaultName,
  disabled,
  onClose,
  onSend,
}: {
  defaultName?: string;
  disabled?: boolean;
  onClose: () => void;
  onSend: LocationDialogSend;
}) {
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [name, setName] = useState(defaultName?.trim() || "Loja");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  const geolocation =
    typeof navigator !== "undefined" && "geolocation" in navigator
      ? navigator.geolocation
      : null;
  const validLocation =
    Number.isFinite(parsedLatitude) &&
    parsedLatitude >= -90 &&
    parsedLatitude <= 90 &&
    Number.isFinite(parsedLongitude) &&
    parsedLongitude >= -180 &&
    parsedLongitude <= 180;
  const mapUrl = validLocation
    ? mapsUrl(parsedLatitude, parsedLongitude)
    : null;
  const nudge = (latStep: number, lngStep: number) => {
    const baseLat = validLocation ? parsedLatitude : 0;
    const baseLng = validLocation ? parsedLongitude : 0;
    setLatitude(String(Number((baseLat + latStep).toFixed(6))));
    setLongitude(String(Number((baseLng + lngStep).toFixed(6))));
  };
  return (
    <ActionDialog
      disabled={disabled || isSaving || !validLocation}
      icon={<MapPin />}
      onClose={onClose}
      onSubmit={async () => {
        if (!validLocation) return;
        setIsSaving(true);
        try {
          const accepted = await onSend({
            ...(address.trim() ? { address: address.trim() } : {}),
            latitude: parsedLatitude,
            longitude: parsedLongitude,
            ...(name.trim() ? { name: name.trim() } : {}),
          });
          if (accepted) onClose();
        } finally {
          setIsSaving(false);
        }
      }}
      title="Enviar localizacao"
    >
      <button
        className="crm-whatsapp-action-inline"
        disabled={disabled || isSaving || !geolocation}
        onClick={() => {
          setError("");
          if (!geolocation) {
            setError("Geolocalizacao indisponivel neste navegador.");
            return;
          }
          geolocation.getCurrentPosition(
            (position) => {
              setLatitude(String(position.coords.latitude));
              setLongitude(String(position.coords.longitude));
            },
            () => setError("Nao foi possivel ler a localizacao atual."),
            { enableHighAccuracy: true, maximumAge: 60_000, timeout: 8_000 },
          );
        }}
        type="button"
      >
        <MapPin aria-hidden="true" />
        Usar minha localizacao
      </button>
      <div className="crm-whatsapp-location-map">
        {mapUrl ? (
          <iframe
            src={`https://www.google.com/maps?q=${parsedLatitude},${parsedLongitude}&z=16&output=embed`}
            title="Mapa da localizacao"
          />
        ) : (
          <span>Informe latitude e longitude ou use a localizacao atual.</span>
        )}
      </div>
      <div className="crm-whatsapp-location-nudge" aria-label="Ajustar mapa">
        <button
          disabled={disabled || isSaving}
          onClick={() => nudge(0.0002, 0)}
          type="button"
        >
          N
        </button>
        <button
          disabled={disabled || isSaving}
          onClick={() => nudge(0, -0.0002)}
          type="button"
        >
          O
        </button>
        <button
          disabled={disabled || isSaving}
          onClick={() => nudge(0, 0.0002)}
          type="button"
        >
          L
        </button>
        <button
          disabled={disabled || isSaving}
          onClick={() => nudge(-0.0002, 0)}
          type="button"
        >
          S
        </button>
        {mapUrl ? (
          <a href={mapUrl} rel="noreferrer" target="_blank">
            Abrir mapa
          </a>
        ) : null}
      </div>
      <label>
        Nome
        <input
          disabled={disabled || isSaving}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      </label>
      <label>
        Endereco
        <input
          disabled={disabled || isSaving}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Rua, numero, bairro"
          value={address}
        />
      </label>
      <div className="crm-whatsapp-action-grid">
        <label>
          Latitude
          <input
            disabled={disabled || isSaving}
            onChange={(event) => setLatitude(event.target.value)}
            placeholder="-23.56168"
            value={latitude}
          />
        </label>
        <label>
          Longitude
          <input
            disabled={disabled || isSaving}
            onChange={(event) => setLongitude(event.target.value)}
            placeholder="-46.65598"
            value={longitude}
          />
        </label>
      </div>
      {error ? <p className="crm-whatsapp-action-error">{error}</p> : null}
    </ActionDialog>
  );
}

function mapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
