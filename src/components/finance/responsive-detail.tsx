'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsDesktop } from '@/hooks/use-media-query';

/**
 * The design's single detail pattern: bottom sheet below 1024px, centered
 * modal on desktop — same content, one host (handoff §8).
 * The primary action belongs in `footer`, pinned at the sheet bottom.
 */
export function ResponsiveDetail({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-[560px]'>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className='max-h-[65dvh] overflow-y-auto'>{children}</div>
          {footer && <div className='flex justify-start gap-2 pt-2'>{footer}</div>}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='bottom' className='max-h-[85dvh] rounded-t-xl'>
        <span
          aria-hidden
          className='mx-auto mt-2 block h-1 w-10 rounded-full bg-surface-3'
        />
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className='flex-1 overflow-y-auto px-4'>{children}</div>
        {footer && (
          <div className='flex flex-col gap-2 border-t border-line p-4 pb-[max(env(safe-area-inset-bottom),1rem)]'>
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
