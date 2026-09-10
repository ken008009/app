export function getAccountAddressErrorMessage(error: unknown): string {
  // Match the serialized error class across the main/background bridge.
  if (
    typeof error === 'object' &&
    error !== null &&
    'className' in error &&
    error.className === 'LocalDBRecordNotFoundError'
  ) {
    return '账户地址尚未生成，请进入对应网络完成地址创建';
  }
  return '账户地址读取失败，请稍后重试';
}

export function hasIncompleteAddressGeneration(
  result:
    | { addedAccounts: readonly unknown[]; failedAccounts: readonly unknown[] }
    | undefined,
): boolean {
  return (
    !result ||
    result.addedAccounts.length === 0 ||
    result.failedAccounts.length > 0
  );
}
