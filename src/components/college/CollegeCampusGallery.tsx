import { useState } from "react";
import { Expand, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cdnImage } from "@/lib/imageTransform";
import CollegeAutoSlider from "./CollegeAutoSlider";

export default function CollegeCampusGallery({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!images.length) return <div className="flex items-center gap-4 border-y border-border bg-secondary/30 px-4 py-6"><Image className="h-8 w-8 shrink-0 text-primary" /><p className="text-sm text-muted-foreground">Campus photos have not been published.</p></div>;
  return <>
    <CollegeAutoSlider items={images} label="Campus photos" variant="gallery" render={(image, i) => (
      <figure className="college-campus-photo overflow-hidden rounded-lg border border-border bg-card">
        <Button variant="ghost" className="block h-auto w-full rounded-none p-0" aria-label={`Open campus photo ${i + 1}`} onClick={() => setSelected(i)}>
          <img src={cdnImage(image, { width: 960 })} alt={`${name} campus photo ${i + 1}`} width={960} height={640} className="w-full aspect-[3/2] object-cover" loading="lazy" decoding="async" />
        </Button>
        <figcaption className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="min-w-0"><p className="text-sm font-semibold text-foreground">{name}</p><p className="text-sm text-muted-foreground">Campus · {i + 1} of {images.length}</p></div>
          <Button variant="outline" size="icon" title="Enlarge photo" aria-label={`Enlarge campus photo ${i + 1}`} onClick={() => setSelected(i)}><Expand /></Button>
        </figcaption>
      </figure>
    )} />
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
      <DialogContent className="max-w-4xl p-4 sm:p-6" aria-describedby={undefined}>
        <DialogTitle className="pr-7">{name} · Campus {selected !== null ? selected + 1 : ""}</DialogTitle>
        {selected !== null && <img src={images[selected]} alt={`${name} campus photo ${selected + 1}`} className="max-h-[70vh] w-full object-contain" />}
      </DialogContent>
    </Dialog>
  </>;
}