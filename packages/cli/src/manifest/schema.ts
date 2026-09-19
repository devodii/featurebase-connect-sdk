import { z } from 'zod';

export const ManifestSchema = z.object({
	name: z.string().min(1),
	adapter: z.string().min(1),
	outDir: z.string().min(1),
	operations: z.array(z.string().min(1)).min(1),
});

export type Manifest = z.infer<typeof ManifestSchema>;
