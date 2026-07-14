import { Injectable } from '@nestjs/common';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

@Injectable()
export class VolumeSecretStore {
  private readonly root = process.env.SECRET_STORE_PATH ?? '/run/source-mesh/secrets';

  async put(tenantSlug: string, providerCode: string, value: string) {
    const path = join(this.root, tenantSlug, providerCode);
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(path, value, { mode: 0o600 });
    return `volume://${tenantSlug}/${providerCode}`;
  }

  async has(opaqueRef: string) {
    if (!opaqueRef.startsWith('volume://')) return false;
    try {
      await access(join(this.root, opaqueRef.slice('volume://'.length)));
      return true;
    } catch {
      return false;
    }
  }
}
