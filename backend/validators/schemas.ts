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