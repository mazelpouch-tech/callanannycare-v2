import type { VercelRequest, VercelResponse } from '@vercel/node';
import seedHandler from './_seed.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return seedHandler(req, res);
}
