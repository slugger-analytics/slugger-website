import { z } from 'zod';

export const createWidgetSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    visibility: z.string().max(50).optional(),
    redirectLink: z.string().optional(),
    imageUrl: z.string().optional(),
    categoryIds: z.number().array().optional()
});

export const editWidgetSchema = createWidgetSchema.partial();

export const queryParamasSchema = z.object({
    widgetName: z.string().optional(),
    categories: z.string().array().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100, "Limit must be <= 100").optional(),
})