export const successResponse = <T>(data: T, nestedKey?: string) => ({
  data: nestedKey
    ? { status: 'success', data: { [nestedKey]: data } }
    : { status: 'success', data },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
});
