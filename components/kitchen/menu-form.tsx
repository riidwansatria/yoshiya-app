'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Control, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Trash, Plus, GripVertical, ImagePlus, Camera, Loader2, X } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

import { ComponentCombobox } from './component-combobox';
import { MenuTagSelector } from './menu-tag-selector';
import { useMenuFormContext } from './menu-form-context';

import type { Menu } from '@/lib/queries/menus';
import { ComponentOption } from '@/lib/queries/components';
import type { MenuTag } from '@/lib/queries/menu-tags';
import { createMenu, updateMenu } from '@/lib/actions/menus';
import { uploadMenuImage, deleteMenuImage, validateMenuImageFile } from '@/lib/storage/menu-image';
import { updateMenuComponents } from '@/lib/actions/menu-components';
import { updateMenuTags } from '@/lib/actions/menu-tags';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    name_en: z.string().optional(),
    price: z.number().nullable(),
    description: z.string().optional(),
    color: z.string().optional(),
    image_url: z.url().nullable().optional(),
    is_public: z.boolean(),
    tag_ids: z.array(z.string()),
    components: z.array(menuComponentSchema),
});

type FormValues = z.infer<typeof menuSchema>;

type MenuComponentRowProps = {
    id: string;
    index: number;
    control: Control<FormValues>;
    componentOptions: ComponentOption[];
    restaurantId: string;
    usedIds: Set<string>;
    onNewComponent: (component: ComponentOption) => void;
    onRemove: (index: number) => void;
};

const MenuComponentRow = memo(function MenuComponentRow({
    id,
    index,
    control,
    componentOptions,
    restaurantId,
    usedIds,
    onNewComponent,
    onRemove,
}: MenuComponentRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn(
                'flex gap-2 items-center bg-background border rounded-md px-1.5 py-1.5',
                isDragging && 'opacity-50 shadow-lg'
            )}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 shrink-0 touch-none"
            >
                <GripVertical className="h-4 w-4" />
            </button>

            <FormField
                control={control}
                name={`components.${index}.component_id`}
                render={({ field }) => (
                    <FormItem className="flex-1 min-w-0">
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

            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-600"
            >
                <Trash className="h-4 w-4" />
            </Button>
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
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
    const [statusPortalTarget, setStatusPortalTarget] = useState<HTMLElement | null>(null);
    const [imageLoadFailed, setImageLoadFailed] = useState(false);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const pendingImageDeleteRef = useRef<string | null>(null);
    const { setIsSubmitting } = useMenuFormContext();
    const [localComponentsList, setLocalComponentsList] = useState(availableComponents);
    const sortedComponentOptions = useMemo(
        () => [...localComponentsList].sort((a, b) => a.name.localeCompare(b.name)),
        [localComponentsList]
    );
    const sortedTags = useMemo(
        () => [...availableTags].sort((a, b) => a.label.localeCompare(b.label)),
        [availableTags]
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
            name_en: initialData?.name_en ?? '',
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

    useEffect(() => {
        setStatusPortalTarget(document.getElementById('menu-status-slot'));
    }, []);

    useEffect(() => {
        setIsSubmitting(form.formState.isSubmitting);
    }, [form.formState.isSubmitting, setIsSubmitting]);

    const handleRemove = useCallback((index: number) => remove(index), [remove]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = fields.findIndex((f) => f.id === active.id);
            const newIndex = fields.findIndex((f) => f.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) move(oldIndex, newIndex);
        }
    }, [fields, move]);
    const handleNewComponent = useCallback((newComponent: ComponentOption) => {
        setLocalComponentsList((prev) => {
            if (prev.some((component) => component.id === newComponent.id)) {
                return prev;
            }

            return [...prev, newComponent];
        });
    }, []);
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
            setImageLoadFailed(false);
        },
        [pendingPreviewUrl]
    );

    const handleImageRemove = useCallback(() => {
        if (pendingImageFile) {
            if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
            setPendingImageFile(null);
            setPendingPreviewUrl(null);
        } else {
            const current = form.getValues('image_url');
            form.setValue('image_url', null, { shouldDirty: true });
            if (current) {
                pendingImageDeleteRef.current = current;
            }
        }
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
        setImageLoadFailed(false);
    }, [form, pendingImageFile, pendingPreviewUrl]);

    async function onSubmit(data: FormValues) {
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
                    name_en: data.name_en,
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
                    name_en: data.name_en,
                    price: data.price,
                    description: data.description,
                    color: data.color,
                    image_url: finalImageUrl,
                    is_public: data.is_public,
                });
                if (res.error || !res.data) throw new Error(res.error || 'Failed to create menu');
                menuId = res.data.id;
            }

            const parsedComponents = data.components.map((component) => ({
                component_id: component.component_id,
                qty_per_order: 1,
            }));

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

            if (pendingImageDeleteRef.current) {
                await deleteMenuImage(pendingImageDeleteRef.current);
                pendingImageDeleteRef.current = null;
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
                    }
    }

    return (
        <Form {...form}>
            {statusPortalTarget
                ? createPortal(
                    <FormField
                        control={form.control}
                        name="is_public"
                        render={({ field }) => (
                            <Select
                                value={field.value ? 'public' : 'private'}
                                onValueChange={(value) => field.onChange(value === 'public')}
                            >
                                <SelectTrigger
                                    className={cn(
                                        "h-7 w-auto rounded-full border px-2.5 py-4 text-xs font-medium shadow-none focus:ring-0 gap-1.5 [&_svg:not([class*='size-'])]:size-3.5",
                                        field.value
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                            : "bg-muted/60 border-border text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="public">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                            {t('menus.form.statusPublic')}
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="private">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                                            {t('menus.form.statusPrivate')}
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />,
                    statusPortalTarget
                )
                : null}
            <form id="menu-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
                <div className="flex flex-col gap-3">
                    {/* Hero card - full width */}
                    <div className="rounded-md border overflow-hidden">
                        {/* Hidden file input */}
                        <input
                            id="menu-image-upload"
                            ref={imageInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleImageFile(file);
                                e.target.value = '';
                            }}
                        />

                        {/* Hero: image left + core info right */}
                        <div className="grid grid-cols-3 min-h-[260px]">
                            {/* Image area */}
                            <div className="col-span-1 relative bg-muted flex flex-col items-center justify-center gap-3 group">
                                {(pendingPreviewUrl ?? watchedImageUrl) && !imageLoadFailed ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={pendingPreviewUrl ?? watchedImageUrl ?? undefined}
                                            alt=""
                                            className="absolute inset-0 w-full h-full object-cover"
                                            onLoad={() => setImageLoadFailed(false)}
                                            onError={() => setImageLoadFailed(true)}
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                disabled={isUploadingImage}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    imageInputRef.current?.click();
                                                }}
                                            >
                                                {isUploadingImage ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Camera className="mr-1.5 h-4 w-4" />}
                                                {t('menus.form.changeImage')}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                disabled={isUploadingImage}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    void handleImageRemove();
                                                }}
                                            >
                                                <X className="mr-1.5 h-4 w-4" />
                                                {t('menus.form.removeImage')}
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <ImagePlus className="h-8 w-8 text-muted-foreground/30" />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={isUploadingImage}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                imageInputRef.current?.click();
                                            }}
                                        >
                                            {isUploadingImage ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Camera className="mr-1.5 h-4 w-4" />}
                                            {t('menus.form.addImage')}
                                        </Button>
                                        <p className="text-xs text-muted-foreground/50">JPG · PNG · WebP · 最大5MB</p>
                                    </>
                                )}
                            </div>

                            {/* Core info: name, name_en, status, description */}
                            <div className="col-span-2 p-5 flex flex-col gap-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 flex flex-col gap-1">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <input
                                                            placeholder={t('menus.placeholders.name')}
                                                            {...field}
                                                            className="text-xl font-bold w-full bg-transparent outline-none placeholder:text-muted-foreground/40 border-b border-transparent focus:border-border transition-colors pb-0.5"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="name_en"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <input
                                                            placeholder={t('menus.placeholders.nameEn')}
                                                            {...field}
                                                            className="text-sm text-muted-foreground w-full bg-transparent outline-none placeholder:text-muted-foreground/40 border-b border-transparent focus:border-border transition-colors pb-0.5"
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="price"
                                        render={({ field }) => (
                                            <FormItem className="shrink-0">
                                                <FormControl>
                                                    <label className="flex items-baseline gap-1 rounded-lg border border-transparent bg-muted/60 px-3 py-2 transition-colors cursor-text focus-within:border-border focus-within:bg-background">
                                                        <span className="text-xl font-semibold text-muted-foreground select-none">¥</span>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={field.value != null && !isNaN(field.value) ? field.value.toLocaleString('ja-JP') : ''}
                                                            placeholder="—"
                                                            onChange={(e) => {
                                                                const raw = e.target.value.replace(/,/g, '');
                                                                if (!raw) { field.onChange(null); return; }
                                                                const num = Number(raw);
                                                                if (!isNaN(num)) field.onChange(num);
                                                            }}
                                                            className="text-3xl font-bold w-28 text-right bg-transparent outline-none placeholder:text-muted-foreground/40"
                                                        />
                                                    </label>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="border-t pt-3 flex-1 flex flex-col gap-1.5">
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem className="flex min-h-0 flex-1 flex-col">
                                                <FormLabel>{t('menus.form.description')}</FormLabel>
                                                <FormControl className="flex min-h-0 flex-1">
                                                    <Textarea
                                                        placeholder={t('menus.placeholders.description')}
                                                        className="min-h-0 flex-1 resize-none"
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom row: secondary fields + components */}
                    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-3">
                        {/* Secondary fields */}
                        <div className="grid h-fit grid-cols-2 gap-4 rounded-md border p-5 md:col-span-2">
                            <div className="col-span-2">
                                <h3 className="font-semibold text-lg">{t('menus.form.additionalDetails')}</h3>
                            </div>
                            <div className="col-span-2">
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
                            </div>
                            <FormField
                                control={form.control}
                                name="tag_ids"
                                render={({ field }) => (
                                    <>
                                        {(['season', 'dietary', 'ingredient'] as const).map((kind) => (
                                            <div key={kind} className="col-span-2">
                                                <FormItem>
                                                    <FormLabel>{t(`menus.tags.kindLabels.${kind}`)}</FormLabel>
                                                    <FormControl>
                                                        <MenuTagSelector
                                                            tags={sortedTags}
                                                            kind={kind}
                                                            selectedTagIds={field.value ?? []}
                                                            onChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            </div>
                                        ))}
                                        <FormMessage />
                                    </>
                                )}
                            />
                        </div>

                    {/* Components Mapping Column */}
                    <div className="flex flex-col gap-3 rounded-md border p-4">
                        <div className="flex justify-between items-center shrink-0">
                            <h3 className="font-semibold text-lg">{t('menus.form.mappedComponents')}</h3>
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
                            <>
                                <DndContext
                                    id="menu-components-dnd"
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    modifiers={[restrictToVerticalAxis]}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={fields.map((f) => f.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {fields.map((field, index) => {
                                                const usedIds = new Set(
                                                    watchedComponents
                                                        .map((component) => component?.component_id)
                                                        .filter((id): id is string => !!id)
                                                );
                                                return (
                                                    <MenuComponentRow
                                                        key={field.id}
                                                        id={field.id}
                                                        index={index}
                                                        control={form.control}
                                                        componentOptions={sortedComponentOptions}
                                                        restaurantId={restaurantId}
                                                        usedIds={usedIds}
                                                        onNewComponent={handleNewComponent}
                                                        onRemove={handleRemove}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </>
                        )}
                    </div>
                    </div>
                </div>


            </form>
        </Form>
    );
}
