import { pageSchema } from 'fumadocs-core/source/schema';
import { isFeatureBadge, type FeatureBadge } from './feature-badge';

// Extend the macro's default schema so title/description retain their behavior.
// A typo fails content validation instead of silently publishing the wrong state.
export const docsSchema = pageSchema.extend({
  featureBadge: pageSchema.shape.title
    .refine(isFeatureBadge, { message: 'featureBadge must be new, updated, experimental, or deprecated' })
    .transform(value => value as FeatureBadge)
    .optional(),
});
