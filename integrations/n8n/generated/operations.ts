/* eslint-disable @n8n/community-nodes/no-restricted-imports, import-x/no-unresolved */
import { type OperationDescriptor } from '@featurebase-connect-sdk/core';

export const n8nOperations: Record<string, OperationDescriptor> = { listPosts: { method: "GET", path: "/v2/posts" }, getPost: { method: "GET", path: "/v2/posts/{id}" }, createPost: { method: "POST", path: "/v2/posts" }, updatePost: { method: "PATCH", path: "/v2/posts/{id}" }, deletePost: { method: "DELETE", path: "/v2/posts/{id}" } };
