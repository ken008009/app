import axios from 'axios';

import { CloudChatHttpClient } from './CloudChatHttpClient';

jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

describe('CloudChatHttpClient', () => {
  const request = jest.fn();
  beforeEach(() => {
    jest.useFakeTimers();
    request.mockReset();
    (axios.create as jest.Mock).mockReturnValue({ request });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries converted 503 errors with the same ciphertext and ID', async () => {
    const body = {
      recipient_service_id: 'recipient',
      recipient_device_id: 1,
      recipient_registration_id: 3,
      client_message_id: 'fixed-id',
      message_type: 'prekey' as const,
      ciphertext: 'public-test-fixture',
    };
    request
      .mockRejectedValueOnce({
        response: { status: 503, data: { error: 'unavailable' } },
      })
      .mockResolvedValue({ data: { id: '99', acknowledged: false } });
    const client = new CloudChatHttpClient(
      async () => 'https://chat.example',
      async () => 'test-token',
    );
    const result = client.sendCiphertext(body);
    await jest.runAllTimersAsync();
    await expect(result).resolves.toEqual({ id: '99', acknowledged: false });
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][0].data).toEqual(
      request.mock.calls[1][0].data,
    );
  });

  it('does not retry authentication or identity conflicts', async () => {
    request.mockRejectedValue({
      response: { status: 409, data: { error: 'identity_conflict' } },
    });
    const client = new CloudChatHttpClient(
      async () => 'https://chat.example',
      async () => undefined,
    );
    await expect(client.keyCounts()).rejects.toMatchObject({
      httpStatusCode: 409,
    });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
