'use client';

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Control, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Trash, Plus, ArrowUp, ArrowDown, ImagePlus, Loader2, X } from 'lucide-react';

import { ComponentCombobox } from './component-combobox';
import { MenuTagSelector } from './menu-tag-selector';

import type { Menu } from '@/lib/queries/menus';
import { ComponentOption } from '@/lib/queries/components';
import type { MenuTag } from '@/lib/queries/menu-tags';
import { createMenu, updateMenu } from '@/lib/actions/menus';
import { uploadMenuImage, deleteMenuImage, validateMenuImageFile } from '@/lib/storage/menu-image';
import { updateMenuComponents } from '@/lib/actions/menu-components';
import { updateMenuTags } from '@/lib/actions/menu-tags';
import { parseFractionalQuantity } from '@/lib/utils/fraction-quantity';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FractionalQuantityInput } from './fractional-quantity-input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';

const menuComponentSchema = z.object({
    component_id: z.string().min(1, 'Please select a component'),
    qty_per_order: z.string().min(1, 'Quantity is required'),
});

const menuSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    season: z.string().optional(),
    price: z.number().nullable(),
    description: z.string().optional(),
    color: z.string().optional(),
    image_url: z.string().url().nullable().optional(),
    is_public: z.boolean(),
    tag_ids: z.array(z.string()),
    components: z.array(menuComponentSchema),
});

type FormValues = z.infer<typeof menuSchema>;

type MenuComponentRowProps = {
    index: number;
    rowCount: number;
    control: Control<FormValues>;
    componentOptions: ComponentOption[];
    restaurantId: string;
    usedIds: Set<string>;
    onNewComponent: (component: ComponentOption) => void;
    onMoveUp: (index: number) => void;
    onMoveDown: (index: number) => void;
    onRemove: (index: number) => void;
    onQuantityCommit: (index: number, parsed: number | null, error: string | null) => void;
    t: ReturnType<typeof useTranslations<'kitchen'>>;
};

const MenuComponentRow = memo(function MenuComponentRow({
    index,
    rowCount,
    control,
    componentOptions,
    restaurantId,
    usedIds,
    onNewComponent,
    onMoveUp,
    onMoveDown,
    onRemove,
    onQuantityCommit,
    t,
}: MenuComponentRowProps) {
    return (
        <div className="flex gap-4 items-start bg-background border rounded-md p-3">
            <FormField
                control={control}
                name={`components.${index}.component_id`}
                render={({ field }) => (
                    <FormItem className="flex-[2]">
                        <FormLabel className="text-xs">{t('menus.form.component')}</FormLabel>
                        <FormControl>
                            <ComponentCombobox
                                value={field.value}
                                onValueChange={field.onChange}
                                components={componentOptions}
                                restaurantId={restaurantId}
                                usedIds={usedIds}
                                onNewComponent={onNewComponent}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name={`components.${index}.qty_per_order`}
                render={({ field }) => (
                    <FormItem className="flex-[1]">
                        <FormLabel className="text-xs">{t('menus.form.qtyPerOrder')}</FormLabel>
                        <FormControl>
                            <FractionalQuantityInput
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                onCommit={(parsed, error) => onQuantityCommit(index, parsed, error)}
                                label={t('menus.form.qtyPerOrder')}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="mt-6 flex items-center">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => onMoveUp(index)}
                    className="h-8 w-8 text-muted-foreground"
                >
                    <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === rowCount - 1}
                    onClick={() => onMoveDown(index)}
                    className="h-8 w-8 text-muted-foreground"
                >
                    <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(index)}
                    className="h-8 w-8 text-muted-foreground hover:text-red-600 ml-1"
                >
                    <Trash className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
});

export function MenuForm({
    initialData,
    availableComponents,
    availableTags,
    restaurantId,
}: {
    initialData: Menu | null;
    availableComponents: ComponentOption[];
    availableTags: MenuTag[];
    restaurantId: string;
}) {
    const t = useTranslations('kitchen');
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const [localComponentsList, setLocalComponentsList] = useState(availableComponents);
    const [localTagsList, setLocalTagsList] = useState(availableTags);
    const sortedComponentOptions = useMemo(
        () => [...localComponentsList].sort((a, b) => a.name.localeCompare(b.name)),
        [localComponentsList]
    );
    const sortedTags = useMemo(
        () => [...localTagsList].sort((a, b) => a.label.localeCompare(b.label)),
        [localTagsList]
    );

    // Map initial components if editing
    const initialComponents = initialData?.menu_components?.map((mc) => ({
        component_id: mc.component_id,
        qty_per_order: mc.qty_per_order.toString(),
    })) || [];
    const initialTagIds = initialData?.tags?.map((tag) => tag.id) ?? [];

    const form = useForm<FormValues>({
        resolver: zodResolver(menuSchema),
        defaultValues: {
            name: initialData?.name || '',
            season: initialData?.season || '',
            price: initialData?.price ?? null,
            description: initialData?.description || '',
            color: initialData?.color || '',
            image_url: initialData?.image_url ?? null,
            is_public: initialData?.is_public ?? true,
            tag_ids: initialTagIds,
            components: initialComponents,
        },
    });

    const { fields, append, remove, move } = useFieldArray({
        control: form.control,
        name: 'components',
    });
    const handleMoveUp = useCallback((index: number) => move(index, index - 1), [move]);
    const handleMoveDown = useCallback((index: number) => move(index, index + 1), [move]);
    const handleRemove = useCallback((index: number) => remove(index), [remove]);
    const handleNewComponent = useCallback((newComponent: ComponentOption) => {
        setLocalComponentsList((prev) => {
            if (prev.some((component) => component.id === newComponent.id)) {
                return prev;
            }

            return [...prev, newComponent];
        });
    }, []);
    const handleNewTag = useCallback((newTag: MenuTag) => {
        setLocalTagsList((prev) => {
            if (prev.some((tag) => tag.id === newTag.id)) {
                return prev;
            }

            return [...prev, newTag];
        });
    }, []);
    const handleQuantityCommit = useCallback(
        (index: number, _parsed: number | null, error: string | null) => {
            const path = `components.${index}.qty_per_order` as const;
            if (error) {
                form.setError(path, { type: 'manual', message: error });
                return;
            }
            form.clearErrors(path);
        },
        [form]
    );
    const watchedComponents = form.watch('components') ?? [];
    const watchedImageUrl = form.watch('image_url');

    const handleImageFile = useCallback(
        (file: File) => {
            const validationError = validateMenuImageFile(file);
            if (validationError) {
                toast.error(validationError);
                return;
            }
            if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
            setPendingImageFile(file);
            setPendingPreviewUrl(URL.createObjectURL(file));
        },
        [pendingPreviewUrl]
    );

    const handleImageRemove = useCallback(async () => {
        if (pendingImageFile) {
            if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
            setPendingImageFile(null);
            setPendingPreviewUrl(null);
        } else {
            const current = form.getValues('image_url');
            form.setValue('image_url', null, { shouldDirty: true });
            if (current) {
                await deleteMenuImage(current);
            }
        }
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
    }, [form, pendingImageFile, pendingPreviewUrl]);

    async function onSubmit(data: FormValues) {
        setIsSaving(true);
        let menuId = initialData?.id;

        try {
            let finalImageUrl = data.image_url ?? null;

            if (pendingImageFile) {
                setIsUploadingImage(true);
                try {
                    const result = await uploadMenuImage(pendingImageFile, restaurantId);
                    if (!result.ok) {
                        toast.error(result.error);
                        return;
                    }
                    if (finalImageUrl) await deleteMenuImage(finalImageUrl);
                    finalImageUrl = result.publicUrl;
                    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
                    setPendingImageFile(null);
                    setPendingPreviewUrl(null);
                } finally {
                    setIsUploadingImage(false);
                }
            }

            if (initialData) {
                // Update existing menu
                const res = await updateMenu(initialData.id, {
                    name: data.name,
                    season: data.season,
                    price: data.price,
                    description: data.description,
                    color: data.color,
                    image_url: finalImageUrl,
                    is_public: data.is_public,
                });
                if (res.error) throw new Error(res.error);
            } else {
                // Create new menu
                const res = await createMenu({
                    restaurant_id: restaurantId,
                    name: data.name,
                    season: data.season,
                    price: data.price,
                    description: data.description,
                    color: data.color,
                    image_url: finalImageUrl,
                    is_public: data.is_public,
                });
                if (res.error || !res.data) throw new Error(res.error || 'Failed to create menu');
                menuId = res.data.id;
            }

            const parsedComponents = data.components.map((component, index) => {
                const parsed = parseFractionalQuantity(component.qty_per_order);
                if (!parsed.ok) {
                    form.setError(`components.${index}.qty_per_order`, {
                        type: 'manual',
                        message: parsed.error,
                    });
                    return null;
                }
                form.clearErrors(`components.${index}.qty_per_order`);
                return {
                    component_id: component.component_id,
                    qty_per_order: parsed.value,
                };
            });

            if (parsedComponents.some((component) => component === null)) {
                toast.error(t('menus.form.fixQuantityErrors'));
                return;
            }

            // Update mapping
            if (menuId) {
                const mappingRes = await updateMenuComponents(
                    menuId,
                    parsedComponents as { component_id: string; qty_per_order: number }[]
                );
                if (mappingRes.error) throw new Error(mappingRes.error);

                const tagRes = await updateMenuTags(menuId, data.tag_ids);
                if (tagRes.error) throw new Error(tagRes.error);
            }

            toast.success(
                data.price == null
                    ? initialData
                        ? `${t('menus.form.updated')} ${t('menus.priceEmpty')}`
                        : `${t('menus.form.created')} ${t('menus.priceEmpty')}`
                    : initialData
                        ? t('menus.form.updated')
                        : t('menus.form.created')
            );
            router.push(`/dashboard/${restaurantId}/menus`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : t('menus.form.saveFailed');
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 min-h-0">
                    {/* Menu Details Column */}
                    <div className="space-y-4 rounded-md border p-6 h-fit overflow-y-auto">
                        <h3 className="font-semibold text-lg">{t('menus.form.details')}</h3>

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('menus.form.name')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('menus.placeholders.name')} {...field} />
                                        </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="season"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('menus.form.season')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('menus.placeholders.season')} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('menus.form.priceOptional')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                value={field.value ?? ''}
                                                placeholder={t('menus.placeholders.price')}
                                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('menus.form.labelColor')}</FormLabel>
                                <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="color"
                                                className="w-12 h-10 p-1"
                                                value={field.value || '#000000'}
                                                onChange={field.onChange}
                                            />
                                            <Input
                                                type="text"
                                                placeholder={t('menus.placeholders.color')}
                                                {...field}
                                                value={field.value || ''}
                                                className="font-mono"
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('menus.form.description')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t('menus.placeholders.description')}
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="image_url"
                            render={() => (
                                <FormItem>
                                    <FormLabel>画像</FormLabel>
                                    <FormControl>
                                        <div className="space-y-2">
                                            <input
                                                id="menu-image-upload"
                                                ref={imageInputRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="sr-only"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        void handleImageFile(file);
                                                    }
                                                    e.target.value = '';
                                                }}
                                            />
                                            {(pendingPreviewUrl ?? watchedImageUrl) ? (
                                                <div className="flex items-start gap-3">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={pendingPreviewUrl ?? watchedImageUrl ?? undefined}
                                                        alt=""
                                                        className="h-28 w-28 rounded-md border object-cover"
                                                        onError={() => {
                                                            if (!pendingPreviewUrl) {
                                                                form.setValue('image_url', null, { shouldDirty: true })
                                                            }
                                                        }}
                                                    />
                                                    <div className="flex flex-col gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={isUploadingImage}
                                                            onClick={() => imageInputRef.current?.click()}
                                                        >
                                                            {isUploadingImage ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <ImagePlus className="mr-2 h-4 w-4" />
                                                            )}
                                                            画像を変更
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={isUploadingImage}
                                                            onClick={() => void handleImageRemove()}
                                                        >
                                                            <X className="mr-2 h-4 w-4" />
                                                            削除
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isUploadingImage}
                                                    onClick={() => imageInputRef.current?.click()}
                                                >
                                                    {isUploadingImage ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <ImagePlus className="mr-2 h-4 w-4" />
                                                    )}
                                                    画像をアップロード
                                                </Button>
                                            )}
                                            <p className="text-xs text-muted-foreground">JPG / PNG / WebP · 最大5MB</p>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="is_public"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between rounded-md border px-4 py-3">
                                        <div>
                                            <FormLabel className="text-sm font-medium">公開する</FormLabel>
                                            <p className="text-xs text-muted-foreground">埋め込みページに表示されます</p>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </div>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="tag_ids"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('menus.tags.label')}</FormLabel>
                                    <FormControl>
                                        <MenuTagSelector
                                            tags={sortedTags}
                                            selectedTagIds={field.value ?? []}
                                            onChange={field.onChange}
                                            onNewTag={handleNewTag}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Components Mapping Column */}
                    <div className="col-span-2 flex flex-col space-y-4 rounded-md border p-6 min-h-0">
                        <div className="flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-semibold text-lg">{t('menus.form.mappedComponents')}</h3>
                                <p className="text-sm text-muted-foreground">{t('menus.form.mappedComponentsHint')}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('menus.form.quantityHint')}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ component_id: '', qty_per_order: '1' })}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('menus.form.addRow')}
                                </Button>
                            </div>
                        </div>

                        {fields.length === 0 ? (
                            <div className="rounded-md border border-dashed p-8 text-center bg-muted/50 shrink-0">
                                <p className="text-sm text-muted-foreground">{t('menus.form.empty')}</p>
                                <p className="text-xs text-muted-foreground mt-1">{t('menus.form.emptyHint')}</p>
                            </div>
                        ) : (
                            <div className="flex-1 space-y-4 pr-2 overflow-y-auto min-h-0">
                                {fields.map((field, index) => {
                                    const usedIds = new Set(
                                        watchedComponents
                                            .map((component) => component?.component_id)
                                            .filter((id): id is string => !!id)
                                    );

                                    return (
                                        <MenuComponentRow
                                            key={field.id}
                                            index={index}
                                            rowCount={fields.length}
                                            control={form.control}
                                            componentOptions={sortedComponentOptions}
                                            restaurantId={restaurantId}
                                            usedIds={usedIds}
                                            onNewComponent={handleNewComponent}
                                            onMoveUp={handleMoveUp}
                                            onMoveDown={handleMoveDown}
                                            onRemove={handleRemove}
                                            onQuantityCommit={handleQuantityCommit}
                                            t={t}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-4 shrink-0 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/${restaurantId}/menus`)}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={isSaving || isUploadingImage}>
                        {isSaving ? t('common.saving') : t('menus.form.save')}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
