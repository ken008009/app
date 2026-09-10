const fs = require('fs');
const path = require('path');

const app = path.resolve(__dirname, '../../android/app');
const read = (relative) => fs.readFileSync(path.join(app, relative), 'utf8');

describe('CloudChat local network policy isolation', () => {
  it('keeps the default production policy HTTPS-only', () => {
    expect(read('src/main/AndroidManifest.xml')).toContain(
      'android:networkSecurityConfig="@xml/network_security_config"',
    );
    const xml = read('src/main/res/xml/network_security_config.xml');
    expect(xml).toContain('cleartextTrafficPermitted="false"');
    expect(xml).not.toContain('cleartextTrafficPermitted="true"');
  });

  it('allows only the selected LAN host in the opt-in release overlay', () => {
    const xml = read(
      'src/localIntegration/res/xml/network_security_config.xml',
    );
    expect(xml).toContain('<base-config cleartextTrafficPermitted="false"');
    expect(xml.match(/<domain /g)).toHaveLength(1);
    expect(xml).toContain(
      '<domain includeSubdomains="false">192.168.3.44</domain>',
    );
    const gradle = read('build.gradle');
    expect(gradle).toContain(
      'providers.gradleProperty("cloudChatLocalIntegration").orNull == "true"',
    );
    expect(gradle).toMatch(
      /if \(cloudChatLocalIntegration\) \{\s*sourceSets.release.res.srcDir 'src\/localIntegration\/res'/,
    );
  });
});
