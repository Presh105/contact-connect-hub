import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { downloadVcf } from "@/lib/vcf";

type Info = { filename: string; content: string; count: number };
const EVENT = "sc-vcf-downloaded";

/** Starts the VCF download and opens the "what to do next" guide. */
export function downloadVcfAndHelp(filename: string, content: string) {
  downloadVcf(filename, content);
  const count = (content.match(/BEGIN:VCARD/g) || []).length;
  window.dispatchEvent(new CustomEvent<Info>(EVENT, { detail: { filename, content, count } }));
}

const isIos = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
const inAppBrowser = () =>
  typeof navigator !== "undefined" && /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Snapchat|TikTok|; wv\)/i.test(navigator.userAgent);

export function DownloadHelp() {
  const [info, setInfo] = useState<Info | null>(null);

  useEffect(() => {
    const h = (e: Event) => setInfo((e as CustomEvent<Info>).detail);
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);

  if (!info) return null;
  const ios = isIos();

  return (
    <Dialog open onOpenChange={(v) => !v && setInfo(null)}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" /> Your contacts file is ready
          </DialogTitle>
          <DialogDescription>
            {info.count} contacts in <b>{info.filename}</b>. One more step puts them in your phone.
          </DialogDescription>
        </DialogHeader>

        {inAppBrowser() && (
          <p className="rounded-md bg-amber-500/10 p-3 text-sm">
            You opened this inside an app. If nothing downloads, open statusconnect.com.ng in <b>Chrome</b> (Android) or <b>Safari</b> (iPhone) and try again.
          </p>
        )}

        {ios ? (
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6">
            <li>If Safari asks <b>"Do you want to download…"</b>, tap <b>Download</b>.</li>
            <li>Tap the <b>download arrow</b> at the top of Safari and tap the file. You can also open <b>Files → Downloads</b>.</li>
            <li>Tap <b>Add All {info.count} Contacts</b> at the bottom of the screen, then <b>Add All Contacts</b> to confirm.</li>
            <li>The first screen may show only one contact (the Status Connect administrator). That is normal. Use <b>Add All</b>, not "Create New Contact".</li>
          </ol>
        ) : (
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6">
            <li>Open your phone's <b>Files</b> or <b>Downloads</b> and tap <b>{info.filename}</b>.</li>
            <li>Choose <b>Contacts</b> if your phone asks which app to use.</li>
            <li>Pick your <b>Google account</b> as the place to save, so they back up.</li>
            <li>Wait a few minutes, then open WhatsApp, tap New chat and refresh. Your Status will now reach more people.</li>
          </ol>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => downloadVcf(info.filename, info.content)}>
            <Download className="mr-2 h-4 w-4" /> Download again
          </Button>
          <Button className="flex-1" onClick={() => setInfo(null)}>Done</Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Still stuck? Read <a className="underline" href="/blog/fix-vcf-import-not-working-android">how to fix VCF import problems</a>.
        </p>
      </DialogContent>
    </Dialog>
  );
}
