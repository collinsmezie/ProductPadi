import { OpenAI } from "openai";
import { createError } from "../utils/error.utils";
import { ErrorType } from "../types/errors.types";

const OPEN_AI_API_KEY = process.env.OPEN_AI_API_KEY;

if (!OPEN_AI_API_KEY) throw createError(ErrorType.INTERNAL, "Open AI api key is not configured");

export const openai = new OpenAI({ apiKey: OPEN_AI_API_KEY });
