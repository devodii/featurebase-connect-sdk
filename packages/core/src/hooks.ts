import type { ExtractBody, OperationId } from '@featurebase-connect-sdk/types';

export interface HookContext<TOp extends OperationId> {
	operation: TOp;
	payload: ExtractBody<TOp>;
}

export type BeforeRequestHook<TOp extends OperationId> = (context: HookContext<TOp>) => ExtractBody<TOp> | Promise<ExtractBody<TOp>>;

export type HookRegistry = {
	[TOp in OperationId]?: readonly BeforeRequestHook<TOp>[];
};

export function defineHooks(hooks: HookRegistry): HookRegistry {
	return hooks;
}

export async function runBeforeRequestHooks<TOp extends OperationId>(
	operation: TOp,
	payload: ExtractBody<TOp>,
	hooks: readonly BeforeRequestHook<TOp>[] | undefined,
): Promise<ExtractBody<TOp>> {
	let current = payload;
	for (const hook of hooks ?? []) {
		current = await hook({ operation, payload: current });
	}
	return current;
}
