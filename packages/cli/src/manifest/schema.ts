import { z } from 'zod';

export const ManifestSchema = z.object({
	name: z.string().min(1),
	adapter: z.string().min(1),
	outDir: z.string().min(1),
	/** A concrete operationId list, or '*' for every operation in the spec. */
	operations: z.union([z.literal('*'), z.array(z.string().min(1)).min(1)]),
});

export type RawManifest = z.infer<typeof ManifestSchema>;

/** A manifest after `loadManifest` has resolved '*' to the real operationId list. */
export interface Manifest {
	name: string;
	adapter: string;
	outDir: string;
	operations: string[];
}
