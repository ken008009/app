import { MS_ECOSYSTEM_DAPPS, MS_ECOSYSTEM_SECTION_TITLE } from './msEcosystem';

describe('msEcosystem catalog', () => {
  test('exposes the MOBLUS dapp for the MS ecosystem section', () => {
    expect(MS_ECOSYSTEM_SECTION_TITLE).toBe('MS生态系统');
    expect(MS_ECOSYSTEM_DAPPS).toHaveLength(1);
    expect(MS_ECOSYSTEM_DAPPS[0]?.name).toBe('MOBLUS');
    expect(MS_ECOSYSTEM_DAPPS[0]?.url).toBe('https://www.strip.boutique');
    expect(MS_ECOSYSTEM_DAPPS[0]?.dappId).toBe('ms-ecosystem-moblus');
    expect(MS_ECOSYSTEM_DAPPS[0]?.logo).toBeTruthy();
  });
});
