import { z } from 'zod';
import { architectures, platforms, supportStatuses, type Architecture, type Platform, type PlatformSupportConfig } from './platform-support.ts';

const statusSchema = z.enum(Object.keys(supportStatuses) as [keyof typeof supportStatuses, ...Array<keyof typeof supportStatuses>]);
const entrySchema = z.union([statusSchema, z.strictObject({ status: statusSchema, note: z.string().trim().min(1).optional() })]);
const systemSchema = z.strictObject(Object.fromEntries(Object.keys(architectures).map(arch => [arch, entrySchema.optional()])) as Record<Architecture, z.ZodOptional<typeof entrySchema>>);
export const platformSupportSchema = z.strictObject({
  showArch: z.boolean().optional(),
  systems: z.strictObject(Object.fromEntries(Object.keys(platforms).map(platform => [platform, systemSchema.optional()])) as Record<Platform, z.ZodOptional<typeof systemSchema>>),
}) satisfies z.ZodType<PlatformSupportConfig>;
export const platformBadgeSchema = z.strictObject({
  system: z.enum(Object.keys(platforms) as [Platform, ...Platform[]]),
  arch: z.enum(Object.keys(architectures) as [Architecture, ...Architecture[]]).optional(),
  status: statusSchema,
  note: z.string().trim().min(1).optional(),
});
