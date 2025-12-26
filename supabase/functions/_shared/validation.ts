export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string> };

export function validateRequired<T extends Record<string, unknown>>(
  data: unknown,
  requiredFields: (keyof T)[]
): ValidationResult<T> {
  if (!data || typeof data !== "object") {
    return { success: false, errors: { _body: "Corpo da requisicao invalido" } };
  }

  const errors: Record<string, string> = {};
  const obj = data as Record<string, unknown>;

  for (const field of requiredFields) {
    const value = obj[field as string];
    if (value === undefined || value === null || value === "") {
      errors[field as string] = `Campo obrigatorio`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: obj as T };
}

export function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string
): ValidationResult<T> {
  if (typeof value !== "string") {
    return { success: false, errors: { [fieldName]: "Valor deve ser texto" } };
  }

  if (!allowedValues.includes(value as T)) {
    return {
      success: false,
      errors: { [fieldName]: `Valor invalido. Permitidos: ${allowedValues.join(", ")}` },
    };
  }

  return { success: true, data: value as T };
}

export function validateUUID(value: unknown, fieldName: string): ValidationResult<string> {
  if (typeof value !== "string") {
    return { success: false, errors: { [fieldName]: "Valor deve ser texto" } };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(value)) {
    return { success: false, errors: { [fieldName]: "UUID invalido" } };
  }

  return { success: true, data: value };
}

export function validateNumber(
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number; integer?: boolean }
): ValidationResult<number> {
  const num = typeof value === "string" ? parseFloat(value) : value;

  if (typeof num !== "number" || isNaN(num)) {
    return { success: false, errors: { [fieldName]: "Valor deve ser numerico" } };
  }

  if (options?.integer && !Number.isInteger(num)) {
    return { success: false, errors: { [fieldName]: "Valor deve ser inteiro" } };
  }

  if (options?.min !== undefined && num < options.min) {
    return { success: false, errors: { [fieldName]: `Valor minimo: ${options.min}` } };
  }

  if (options?.max !== undefined && num > options.max) {
    return { success: false, errors: { [fieldName]: `Valor maximo: ${options.max}` } };
  }

  return { success: true, data: num };
}

export function validateArray<T>(
  value: unknown,
  fieldName: string,
  itemValidator?: (item: unknown, index: number) => ValidationResult<T>
): ValidationResult<T[]> {
  if (!Array.isArray(value)) {
    return { success: false, errors: { [fieldName]: "Valor deve ser array" } };
  }

  if (itemValidator) {
    const errors: Record<string, string> = {};
    const validatedItems: T[] = [];

    for (let i = 0; i < value.length; i++) {
      const result = itemValidator(value[i], i);
      if (!result.success) {
        for (const [key, msg] of Object.entries(result.errors)) {
          errors[`${fieldName}[${i}].${key}`] = msg;
        }
      } else {
        validatedItems.push(result.data);
      }
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: validatedItems };
  }

  return { success: true, data: value as T[] };
}

export const ALLOWED_GENDERS = ["male", "female", "mixed"] as const;
export const ALLOWED_MATCH_STATUSES = ["pending_approval", "scheduling", "scheduled", "cancelled", "completed"] as const;
export const ALLOWED_PREFERRED_SIDES = ["left", "right", "any"] as const;
export const ALLOWED_LEAGUE_TYPES = ["club", "friends", "official"] as const;
export const ALLOWED_LEAGUE_FORMATS = ["weekly", "monthly", "season"] as const;

export type Gender = typeof ALLOWED_GENDERS[number];
export type MatchStatus = typeof ALLOWED_MATCH_STATUSES[number];
export type PreferredSide = typeof ALLOWED_PREFERRED_SIDES[number];
export type LeagueType = typeof ALLOWED_LEAGUE_TYPES[number];
export type LeagueFormat = typeof ALLOWED_LEAGUE_FORMATS[number];

export function whitelistFields<T extends Record<string, unknown>>(
  data: T,
  allowedFields: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const field of allowedFields) {
    if (field in data) {
      result[field] = data[field];
    }
  }
  return result;
}
