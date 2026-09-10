import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { processDueReviews } from '../modules/reviews/review.service.js';

export function startReviewJob() {
  const run = () => processDueReviews().catch(err => logger.error({ err }, 'review_job_failed'));
  const timer = setInterval(run, env.JOB_INTERVAL_MS);
  timer.unref();
  run();
}
