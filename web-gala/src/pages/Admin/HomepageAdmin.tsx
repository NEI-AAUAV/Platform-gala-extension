import { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faUpload, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useHomepageConfig, type BusVehicle } from "@/hooks/useHomepageConfig";
import GalaService from "@/services/GalaService";
import {
  Field,
  TextInput,
  TextArea,
  Toggle,
  Section,
  StringListEditor,
  INPUT_CLS,
} from "./components/AdminUI";


function ImageUploadField({
  label,
  currentUrl,
  onUpload,
  onDelete,
}: {
  readonly label: string;
  readonly currentUrl: string | null;
  readonly onUpload: (file: File) => Promise<void>;
  readonly onDelete: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Field label={label}>
      <div className="flex flex-col gap-3">
        {currentUrl && (
          <div className="relative w-32 overflow-hidden rounded-lg border border-white/10">
            <img src={currentUrl} alt="" className="h-20 w-full object-cover" />
            <button
              type="button"
              onClick={onDelete}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white/60 hover:text-red-400"
            >
              <FontAwesomeIcon icon={faXmark} className="text-[0.6rem]" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-fit items-center gap-2 rounded-lg border border-dashed border-white/20 px-4 py-2 text-xs text-white/40 transition hover:border-white/40 hover:text-white/70 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faUpload} className="text-[0.6rem]" />
          {(() => {
            if (uploading) return "A carregar...";
            if (currentUrl) return "Substituir foto";
            return "Carregar foto";
          })()}
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
      </div>
    </Field>
  );
}

function BusesEditor({ buses, onChange }: { readonly buses: BusVehicle[]; readonly onChange: (v: BusVehicle[]) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_6rem_2.5rem] gap-2 px-1">
        {["Nome do autocarro", "Lugares", ""].map((h) => (
          <span key={h} className="text-[0.55rem] uppercase tracking-widest text-white/25">{h}</span>
        ))}
      </div>
      {buses.map((bus, i) => (
        <div key={bus.id} className="grid grid-cols-[1fr_6rem_2.5rem] gap-2">
          <input
            type="text"
            value={bus.name}
            onChange={(e) => onChange(buses.map((b, idx) => idx === i ? { ...b, name: e.target.value } : b))}
            placeholder="Ex: Autocarro 1"
            className={INPUT_CLS}
          />
          <input
            type="number"
            min={1}
            value={bus.capacity}
            onChange={(e) => onChange(buses.map((b, idx) => idx === i ? { ...b, capacity: Number(e.target.value) } : b))}
            className={INPUT_CLS}
          />
          <button type="button" onClick={() => onChange(buses.filter((_, idx) => idx !== i))} className="flex items-center justify-center rounded-lg text-red-400/50 transition hover:bg-red-500/10 hover:text-red-400">
            <FontAwesomeIcon icon={faTrash} className="text-xs" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...buses, { id: `bus_${Date.now()}`, name: "", capacity: 50 }])}
        className="flex items-center gap-2 self-start rounded-full border border-dashed border-dark-gold/40 px-3 py-1.5 text-xs text-dark-gold/70 transition hover:border-dark-gold hover:text-dark-gold"
      >
        <FontAwesomeIcon icon={faPlus} /> Adicionar autocarro
      </button>
    </div>
  );
}

export default function HomepageAdmin() {
  const { config, emailConfig, updateSection, updateEmails } = useHomepageConfig();
  const [saved, setSaved] = useState(false);

  const save = <K extends keyof typeof config>(section: K, updates: Partial<(typeof config)[K]>) => {
    updateSection(section, updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDJPhotoUpload = async (file: File) => {
    const result = await GalaService.homepage.uploadDJPhoto(file);
    save("dj", { photo_url: result.url });
  };

  const handleDJPhotoDelete = async () => {
    await GalaService.homepage.deleteDJPhoto();
    save("dj", { photo_url: null });
  };

  const handleGalleryPreviewUpload = async (file: File) => {
    const result = await GalaService.homepage.uploadGalleryPreview(file);
    save("gallery", { preview_photo_url: result.url });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">Controla o que aparece na homepage.</p>
        {saved && <span className="text-xs font-semibold text-dark-gold/80">✓ Guardado</span>}
      </div>

      <Section title="1. Categorias e Nomeados" defaultOpen>
        <Toggle
          enabled={config.nominations_display.visible}
          onChange={(v) => save("nominations_display", { visible: v })}
          label="Mostrar secção de categorias"
        />
        {config.nominations_display.visible && (
          <Toggle
            enabled={config.nominations_display.show_nominees}
            onChange={(v) => save("nominations_display", { show_nominees: v })}
            label="Mostrar nomeados por categoria"
          />
        )}
      </Section>

      <Section title="2. Valores e Datas de Pagamento">
        <Toggle
          enabled={config.payment_info.visible}
          onChange={(v) => save("payment_info", { visible: v })}
          label="Mostrar secção de pagamento"
        />
      </Section>

      <Section title="3. DJ">
        <Toggle
          enabled={config.dj.visible}
          onChange={(v) => save("dj", { visible: v })}
          label="Mostrar secção do DJ"
        />
        {config.dj.visible && (
          <>
            <Field label="Nome do DJ">
              <TextInput value={config.dj.name} onChange={(v) => save("dj", { name: v })} placeholder="Ex: DJ Nuno" />
            </Field>
            <Field label="Bio / Descrição">
              <TextArea value={config.dj.bio} onChange={(v) => save("dj", { bio: v })} placeholder="Uma breve descrição..." />
            </Field>
            <Field label="Link Playlist Spotify">
              <TextInput value={config.dj.spotify_url ?? ""} onChange={(v) => save("dj", { spotify_url: v || null })} placeholder="https://open.spotify.com/..." />
            </Field>
            <ImageUploadField
              label="Foto do DJ"
              currentUrl={config.dj.photo_url}
              onUpload={handleDJPhotoUpload}
              onDelete={handleDJPhotoDelete}
            />
          </>
        )}
      </Section>

      <Section title="4. Galeria de Fotos">
        <Toggle
          enabled={config.gallery.visible}
          onChange={(v) => save("gallery", { visible: v })}
          label="Mostrar secção da galeria"
        />
        {config.gallery.visible && (
          <>
            <Field label="Título">
              <TextInput value={config.gallery.title} onChange={(v) => save("gallery", { title: v })} placeholder="Galeria" />
            </Field>
            <Field label="Descrição (opcional)">
              <TextArea value={config.gallery.description} onChange={(v) => save("gallery", { description: v })} />
            </Field>
            <Field label="Link da Galeria (Google Drive, etc.)">
              <TextInput value={config.gallery.drive_url} onChange={(v) => save("gallery", { drive_url: v })} placeholder="https://drive.google.com/..." />
            </Field>
            <ImageUploadField
              label="Foto de preview"
              currentUrl={config.gallery.preview_photo_url}
              onUpload={handleGalleryPreviewUpload}
              onDelete={async () => save("gallery", { preview_photo_url: null })}
            />
          </>
        )}
      </Section>

      <Section title="5. Autocarros">
        <Toggle
          enabled={config.bus_schedule.visible}
          onChange={(v) => save("bus_schedule", { visible: v })}
          label="Mostrar secção dos autocarros"
        />
        {config.bus_schedule.visible && (
          <>
            <Field label="Local de partida">
              <TextInput
                value={config.bus_schedule.departure_location}
                onChange={(v) => save("bus_schedule", { departure_location: v })}
                placeholder="Ex: Rotunda do Rossio, Aveiro"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Hora de partida">
                <TextInput
                  value={config.bus_schedule.departure_time}
                  onChange={(v) => save("bus_schedule", { departure_time: v })}
                  placeholder="Ex: 19:30"
                />
              </Field>
              <Field label="Hora de regresso">
                <TextInput
                  value={config.bus_schedule.return_time}
                  onChange={(v) => save("bus_schedule", { return_time: v })}
                  placeholder="Ex: 02:00"
                />
              </Field>
            </div>
            <Field label="Autocarros">
              <BusesEditor
                buses={config.bus_schedule.buses}
                onChange={(v) => save("bus_schedule", { buses: v })}
              />
            </Field>
          </>
        )}
      </Section>

      <Section title="6. After Party">
        <Toggle
          enabled={config.after_party.visible}
          onChange={(v) => save("after_party", { visible: v })}
          label="Mostrar secção da after party"
        />
        {config.after_party.visible && (
          <>
            <Field label="Título">
              <TextInput value={config.after_party.title} onChange={(v) => save("after_party", { title: v })} placeholder="After Party" />
            </Field>
            <Field label="Descrição (opcional)">
              <TextArea value={config.after_party.description} onChange={(v) => save("after_party", { description: v })} />
            </Field>
            <Field label="Bebidas incluídas">
              <StringListEditor
                items={config.after_party.drinks}
                onChange={(v) => save("after_party", { drinks: v })}
                placeholder="Ex: Cerveja, Vinho, Sumos..."
              />
            </Field>
          </>
        )}
      </Section>

      <Section title="7. Notificações por E-mail">
        <Toggle
          enabled={emailConfig.registration_confirmed}
          onChange={(v) => { updateEmails({ registration_confirmed: v }); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          label="Confirmação de Inscrição"
        />
        <Toggle
          enabled={emailConfig.payment_confirmed}
          onChange={(v) => { updateEmails({ payment_confirmed: v }); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          label="Pagamento Aceite"
        />
        <Toggle
          enabled={emailConfig.payment_rejected}
          onChange={(v) => { updateEmails({ payment_rejected: v }); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          label="Comprovativo de Pagamento Rejeitado"
        />
        <Toggle
          enabled={emailConfig.table_invite}
          onChange={(v) => { updateEmails({ table_invite: v }); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          label="Convite para Mesa"
        />
        <Toggle
          enabled={emailConfig.table_confirmed}
          onChange={(v) => { updateEmails({ table_confirmed: v }); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          label="Confirmação em Mesa"
        />
      </Section>
    </div>
  );
}
