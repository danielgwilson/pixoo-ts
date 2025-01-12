import pc from 'picocolors';
import { z } from 'zod';

export const handleError = (error: unknown): never => {
  if (error instanceof z.ZodError) {
    console.error(pc.red('Validation error:'));
    error.errors.forEach((err) => {
      console.error(pc.red(`- ${err.path.join('.')}: ${err.message}`));
    });
  } else if (error instanceof Error) {
    console.error(pc.red(error.message));
  } else {
    console.error(pc.red('An unknown error occurred'));
  }
  process.exit(1);
};
