'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  createCategoryAction,
  renameCategoryAction,
} from '@/app/(finance)/settings/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Context } from '@/types/domain';
import type { SettingsCategoryItem } from '@/server/data/persisted-settings';

const recommendedCategories = [
  { name: 'תספורות וטיפוח', icon: 'content_cut' },
  { name: 'קוסמטיקה', icon: 'spa' },
  { name: 'רכב ותחזוקה', icon: 'car_repair' },
  { name: 'מנויים דיגיטליים', icon: 'subscriptions' },
  { name: 'ספורט וכושר', icon: 'fitness_center' },
  { name: 'חיות מחמד', icon: 'pets' },
] as const;

type Editor =
  | {
      mode: 'create';
      name: string;
      icon: string;
      context: Context;
    }
  | {
      mode: 'rename';
      category: SettingsCategoryItem;
      name: string;
    };

export function CategoryManager({
  categories,
  canEdit,
}: {
  categories: SettingsCategoryItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const householdCategories = categories.filter(
    (category) => category.context === 'household',
  );
  const businessCategories = categories.filter(
    (category) => category.context === 'business',
  );

  function openCreate(
    recommendation?: (typeof recommendedCategories)[number],
  ) {
    setError(undefined);
    setEditor({
      mode: 'create',
      name: recommendation?.name ?? '',
      icon: recommendation?.icon ?? 'category',
      context: 'household',
    });
  }

  function submit() {
    if (!editor) return;
    setError(undefined);
    startSaving(async () => {
      const formData = new FormData();
      formData.set('name', editor.name);
      if (editor.mode === 'create') {
        formData.set('context', editor.context);
        formData.set('icon', editor.icon);
      } else {
        formData.set('categoryId', editor.category.id);
      }

      const result =
        editor.mode === 'create'
          ? await createCategoryAction(formData)
          : await renameCategoryAction(formData);
      if (result.status === 'error') {
        setError(result.message);
        return;
      }

      toast.success(result.message);
      setEditor(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-body font-semibold text-mut'>
            אפשר להוסיף קטגוריה או לשנות שם. השינויים זמינים מיד בסיווג
            הייבוא.
          </p>
          {canEdit && (
            <Button type='button' onClick={() => openCreate()}>
              <Icon name='add' className='text-[18px]' />
              קטגוריה חדשה
            </Button>
          )}
        </div>

        {canEdit && (
          <div className='rounded-lg bg-accent-soft p-3'>
            <p className='text-caption font-bold text-ink'>
              הצעות שעלו מהקבצים שלכם
            </p>
            <div className='mt-2 flex flex-wrap gap-2'>
              {recommendedCategories
                .filter(
                  (recommendation) =>
                    !categories.some(
                      (category) =>
                        category.name === recommendation.name ||
                        category.icon === recommendation.icon,
                    ),
                )
                .map((recommendation) => (
                  <Button
                    key={recommendation.name}
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => openCreate(recommendation)}
                  >
                    <Icon
                      name={recommendation.icon}
                      className='text-[16px]'
                    />
                    {recommendation.name}
                  </Button>
                ))}
            </div>
          </div>
        )}

        <div className='grid gap-4 md:grid-cols-2'>
          <CategoryGroup
            title='משק בית'
            categories={householdCategories}
            canEdit={canEdit}
            onRename={(category) => {
              setError(undefined);
              setEditor({ mode: 'rename', category, name: category.name });
            }}
          />
          <CategoryGroup
            title='עסק'
            categories={businessCategories}
            canEdit={canEdit}
            onRename={(category) => {
              setError(undefined);
              setEditor({ mode: 'rename', category, name: category.name });
            }}
          />
        </div>
      </div>

      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => {
          if (!open && !saving) setEditor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className='text-subhead font-extrabold text-ink'>
              {editor?.mode === 'rename'
                ? 'שינוי שם קטגוריה'
                : 'קטגוריה חדשה'}
            </DialogTitle>
            <DialogDescription>
              השם יופיע ברשימות הסיווג, בתקציב ובתנועות.
            </DialogDescription>
          </DialogHeader>

          {editor && (
            <form
              className='flex flex-col gap-4'
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <div className='flex flex-col gap-1.5'>
                <Label htmlFor='category-name'>שם הקטגוריה</Label>
                <Input
                  id='category-name'
                  autoFocus
                  required
                  minLength={2}
                  maxLength={50}
                  value={editor.name}
                  onChange={(event) =>
                    setEditor({ ...editor, name: event.target.value })
                  }
                />
              </div>

              {editor.mode === 'create' && (
                <fieldset className='flex flex-col gap-1.5'>
                  <legend className='text-caption font-semibold text-ink-2'>
                    משק בית או עסק
                  </legend>
                  <div
                    role='radiogroup'
                    aria-label='הקשר הקטגוריה'
                    className='inline-flex rounded-lg bg-surface-2 p-1'
                  >
                    {(
                      [
                        { value: 'household', label: 'משק בית', icon: 'home' },
                        { value: 'business', label: 'עסק', icon: 'storefront' },
                      ] as const
                    ).map((option) => {
                      const active = editor.context === option.value;
                      return (
                        <button
                          key={option.value}
                          type='button'
                          role='radio'
                          aria-checked={active}
                          onClick={() =>
                            setEditor({
                              ...editor,
                              context: option.value,
                            })
                          }
                          className={cn(
                            'flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-caption font-bold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                            active
                              ? 'bg-accent text-accent-foreground shadow-sm'
                              : 'text-mut hover:text-ink-2',
                          )}
                        >
                          <Icon name={option.icon} className='text-[16px]' />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {error && (
                <p role='alert' className='text-caption font-bold text-neg-ink'>
                  {error}
                </p>
              )}

              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  disabled={saving}
                  onClick={() => setEditor(null)}
                >
                  ביטול
                </Button>
                <Button type='submit' disabled={saving}>
                  {saving ? 'שומרים…' : 'שמירה'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategoryGroup({
  title,
  categories,
  canEdit,
  onRename,
}: {
  title: string;
  categories: SettingsCategoryItem[];
  canEdit: boolean;
  onRename: (category: SettingsCategoryItem) => void;
}) {
  return (
    <section>
      <h3 className='mb-2 text-caption font-bold text-mut'>{title}</h3>
      <ul className='flex flex-col divide-y divide-line rounded-lg border border-line px-3'>
        {categories.map((category) => (
          <li key={category.id} className='flex min-h-11 items-center gap-2 py-2'>
            <Icon name={category.icon} className='text-[18px] text-mut' />
            <span className='min-w-0 flex-1 truncate text-body font-bold text-ink'>
              {category.name}
            </span>
            {canEdit && (
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                aria-label={`שינוי שם הקטגוריה ${category.name}`}
                onClick={() => onRename(category)}
              >
                <Icon name='edit' className='text-[16px]' />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
