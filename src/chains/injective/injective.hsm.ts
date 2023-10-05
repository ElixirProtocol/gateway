import * as graphene from 'graphene-pk11';
import * as ethUtil from 'ethereumjs-util';
import * as BytesUtils from '@ethersproject/bytes';

export class HsmSession {
  hsm_pin: string;
  pub_key_base64: string;
  hsm_key_label: string;
  lib_path: string;
  mod: graphene.Module;
  session!: graphene.Session;

  constructor(
    pub_key_base64: string,
    hsm_pin: string,
    hsm_key_label: string,
    lib_path: string = '/opt/cloudhsm/lib/libcloudhsm_pkcs11.so'
  ) {
    this.hsm_pin = hsm_pin;
    this.pub_key_base64 = pub_key_base64;
    this.hsm_key_label = hsm_key_label;
    this.lib_path = lib_path;
    this.mod = graphene.Module.load(lib_path, 'SoftHSM');

    try {
      this.mod.initialize();
      const slot = this.mod.getSlots(0, true);
      this.session = slot.open(
        graphene.SessionFlag.SERIAL_SESSION | graphene.SessionFlag.RW_SESSION
      );
      this.session.login(this.hsm_pin);
    } catch (e) {
      console.error(e);
      console.error({ ERROR: 'PKCS#11 Error when creating session.' });
    }
  }

  sign(msghash: Buffer): Uint8Array {
    const privateKeyTemplate: graphene.ITemplate = {
      class: graphene.ObjectClass.PRIVATE_KEY,
      keyType: graphene.KeyType.ECDSA,
      label: this.hsm_key_label,
    };
    const privateKeyHandle = this.session
      .find(privateKeyTemplate)
      .items(0)
      .toType<graphene.PrivateKey>();
    const signer = this.session?.createSign('ECDSA', privateKeyHandle);
    const signature = signer?.once(msghash);
    const adjusted_signature = this.adjust_signature(signature);
    return adjusted_signature;
  }

  adjust_signature(signature: Buffer) {
    const secp256k1_n = new ethUtil.BN(
      'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141',
      16
    );
    const secp256k1_halfn = secp256k1_n.divn(2);

    const r = signature.slice(0, 32);
    let s = new ethUtil.BN(signature.slice(32));

    if (s.gt(secp256k1_halfn)) {
      s = secp256k1_n.sub(s);
    }

    return BytesUtils.arrayify(BytesUtils.concat([r, s.toArrayLike(Buffer)]));
  }
}
