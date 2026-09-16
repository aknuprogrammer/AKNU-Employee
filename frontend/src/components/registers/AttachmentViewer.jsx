import React, { useState } from 'react';
import { Paperclip, ExternalLink, FileText, Image as ImageIcon, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Normalizes attachment URLs to support Cloudinary HTTPS URLs as well as legacy uploads
 */
export const getFileUrl = (path) => {
  if (!path) return '';
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // If it's a Cloudinary PDF, route through secure download proxy to bypass Cloudinary CDN ACL restrictions
    if (path.includes('cloudinary.com') && /\.pdf$/i.test(path)) {
      return `${apiBase}/registers/attachment?url=${encodeURIComponent(path)}`;
    }
    return path;
  }
  // Fallback for legacy relative uploads
  const backendBase = apiBase.replace(/\/api$/, '');
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${backendBase}/${cleanPath}`;
};

export const AttachmentViewer = ({ attachments = [], label = 'View' }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!attachments || attachments.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  // If single attachment, direct click or preview
  if (attachments.length === 1) {
    const fileUrl = getFileUrl(attachments[0]);
    const isPdf = /\.pdf$/i.test(fileUrl);
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileUrl) && !isPdf;

    return (
      <div className="inline-flex items-center gap-1.5">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
          title="Open Document in new tab"
        >
          {isPdf ? <FileText className="h-3.5 w-3.5 text-rose-500" /> : isImage ? <ImageIcon className="h-3.5 w-3.5 text-blue-500" /> : <Paperclip className="h-3.5 w-3.5" />}
          <span>{label}</span>
          <ExternalLink className="h-3 w-3 opacity-70" />
        </a>
        {isPdf && fileUrl.includes('cloudinary.com') && (
          <a
            href={fileUrl.replace(/\.pdf$/i, '.png')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted-foreground hover:text-primary underline px-1"
            title="View first page as Image"
          >
            (Img)
          </a>
        )}
      </div>
    );
  }

  // If multiple attachments, open popup dialog to browse all
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-accent/20 text-accent-foreground hover:bg-accent/30 transition-colors border border-accent/40"
      >
        <Paperclip className="h-3.5 w-3.5" />
        <span>{attachments.length} files</span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-primary" />
              Attached Documents ({attachments.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2 max-h-[60vh] overflow-y-auto pr-1">
            {attachments.map((file, idx) => {
              const url = getFileUrl(file);
              const isPdf = /\.pdf$/i.test(url);
              const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url) && !isPdf;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {isImage ? (
                      <div className="h-9 w-9 rounded border overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                        <img src={url} alt="Attachment" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-9 w-9 rounded border bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-medium truncate">Document #{idx + 1} {isPdf ? '(PDF)' : ''}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-secondary hover:bg-secondary/80"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                    {isPdf && url.includes('cloudinary.com') && (
                      <a
                        href={url.replace(/\.pdf$/i, '.png')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2 py-1 rounded border hover:bg-muted"
                        title="View rendered page as PNG"
                      >
                        Image
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AttachmentViewer;
