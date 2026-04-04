export interface MergeResult<Field extends string> {
    applied_fields: Field[];
    conflicting_fields: Field[];
    record_deleted: boolean;
}

type DirtyFieldMap<Field extends string> = Partial<Record<Field, boolean | undefined>>;

export function mergeUntouchedFields<
    Field extends string,
    Values extends Record<Field, string | number | null>
>({
    fields,
    currentValues,
    remoteValues,
    dirtyFields,
}: {
    fields: readonly Field[];
    currentValues: Values;
    remoteValues: Values;
    dirtyFields: DirtyFieldMap<Field>;
}) {
    const nextValues = {} as Partial<Values>;
    const result: MergeResult<Field> = {
        applied_fields: [],
        conflicting_fields: [],
        record_deleted: false,
    };

    for (const field of fields) {
        const currentValue = currentValues[field];
        const remoteValue = remoteValues[field];

        if (currentValue === remoteValue) {
            continue;
        }

        if (dirtyFields[field]) {
            result.conflicting_fields.push(field);
            continue;
        }

        nextValues[field] = remoteValue;
        result.applied_fields.push(field);
    }

    return {
        ...result,
        nextValues,
    };
}

export interface ComponentIngredientDraft {
    ingredient_id: string;
    qty_per_serving: string;
}

export function areIngredientDraftRowsEqual(
    left: ComponentIngredientDraft[],
    right: ComponentIngredientDraft[]
) {
    if (left.length !== right.length) {
        return false;
    }

    return left.every((row, index) => {
        const other = right[index];
        return row.ingredient_id === other?.ingredient_id && row.qty_per_serving === other?.qty_per_serving;
    });
}

export function mergeComponentIngredientRows({
    currentRows,
    syncedRows,
    remoteRows,
}: {
    currentRows: ComponentIngredientDraft[];
    syncedRows: ComponentIngredientDraft[];
    remoteRows: ComponentIngredientDraft[];
}) {
    const result: MergeResult<'ingredients'> = {
        applied_fields: [],
        conflicting_fields: [],
        record_deleted: false,
    };

    if (areIngredientDraftRowsEqual(syncedRows, remoteRows)) {
        return {
            ...result,
            nextRows: null,
            remote_changed: false,
        };
    }

    if (areIngredientDraftRowsEqual(currentRows, syncedRows)) {
        result.applied_fields.push('ingredients');
        return {
            ...result,
            nextRows: remoteRows,
            remote_changed: true,
        };
    }

    result.conflicting_fields.push('ingredients');
    return {
        ...result,
        nextRows: null,
        remote_changed: true,
    };
}
