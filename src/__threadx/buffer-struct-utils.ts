function isValidTypeIdCharCode(charCode: number): boolean {
  // Allow uppercase letters and numbers
  return (
    (charCode >= 65 && charCode <= 90) || (charCode >= 48 && charCode <= 57)
  );
}

export function genTypeId(tidString: string): number {
  let typeId = 0;
  if (tidString.length === 0) {
    throw new Error(`genTypeId: Type ID string must be at least 1 character`);
  } else if (tidString.length > 4) {
    throw new Error(`genTypeId: Type ID string must be 4 characters or less`);
  }
  for (let i = 0; i < tidString.length; i++) {
    let charCode = tidString.charCodeAt(i);
    if (charCode !== charCode) {
      // Use 0 for NaN
      charCode = 0;
    } else if (!isValidTypeIdCharCode(charCode)) {
      // Throw if the character is not a valid type ID character
      throw new Error(
        `genTypeId: Invalid character '${tidString[
          i
        ]!}' (char code: ${charCode}) in type ID string. A-Z and 0-9 only.`,
      );
    }
    typeId |= charCode << (i * 8);
  }
  return typeId;
}

/**
 * Converts a type ID to its string form.
 *
 * @remarks
 * If the type ID is not a valid type ID, null is returned.
 *
 * @param typeId
 * @returns
 */
export function stringifyTypeId(typeId: number): string | null {
  const chars = [];
  for (let i = 0; i < 4; i++) {
    const charCode = typeId & 0xff;
    if (isValidTypeIdCharCode(charCode)) {
      chars.push(String.fromCharCode(charCode));
    } else if (charCode !== 0 || i === 0) {
      // Bail as soon as we encounter an invalid character
      // Except if charCodes other than the first one are 0
      return null;
    }
    typeId >>>= 8;
  }
  return chars.join('');
}
