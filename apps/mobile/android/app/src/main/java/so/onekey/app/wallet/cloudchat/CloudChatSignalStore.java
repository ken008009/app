package so.onekey.app.wallet.cloudchat;

import android.util.Base64;
import java.util.Iterator;
import org.json.JSONObject;
import org.signal.libsignal.protocol.IdentityKey;
import org.signal.libsignal.protocol.IdentityKeyPair;
import org.signal.libsignal.protocol.ReusedBaseKeyException;
import org.signal.libsignal.protocol.SignalProtocolAddress;
import org.signal.libsignal.protocol.ecc.ECPublicKey;
import org.signal.libsignal.protocol.state.PreKeyRecord;
import org.signal.libsignal.protocol.state.SignedPreKeyRecord;
import org.signal.libsignal.protocol.state.KyberPreKeyRecord;
import org.signal.libsignal.protocol.state.SessionRecord;
import org.signal.libsignal.protocol.state.impl.InMemorySignalProtocolStore;

/** Transaction-local libsignal store. No mutation is committed on decrypt failure. */
final class CloudChatSignalStore extends InMemorySignalProtocolStore {
  private final JSONObject state;

  static String encode(byte[] bytes) { return Base64.encodeToString(bytes, Base64.NO_WRAP); }
  static byte[] decode(String value) { return Base64.decode(value, Base64.NO_WRAP); }

  static JSONObject object(JSONObject root, String name) {
    JSONObject value = root.optJSONObject(name);
    if (value == null) { value = new JSONObject(); put(root, name, value); }
    return value;
  }

  static void put(JSONObject root, String name, Object value) {
    try { root.put(name, value); } catch (Exception error) { throw new IllegalStateException("Invalid state", error); }
  }

  CloudChatSignalStore(JSONObject state) throws Exception {
    super(new IdentityKeyPair(decode(state.getString("identity"))), state.getInt("registration"));
    this.state = state;
    for (String table : new String[]{"prekeys", "signed", "kyber", "sessions", "identities"}) {
      JSONObject records = object(state, table);
      Iterator<String> ids = records.keys();
      while (ids.hasNext()) {
        String id = ids.next();
        byte[] bytes = decode(records.getString(id));
        switch (table) {
          case "prekeys": super.storePreKey(Integer.parseInt(id), new PreKeyRecord(bytes)); break;
          case "signed": super.storeSignedPreKey(Integer.parseInt(id), new SignedPreKeyRecord(bytes)); break;
          case "kyber": super.storeKyberPreKey(Integer.parseInt(id), new KyberPreKeyRecord(bytes)); break;
          case "sessions": super.storeSession(new SignalProtocolAddress(id, 1), new SessionRecord(bytes)); break;
          case "identities": super.saveIdentity(new SignalProtocolAddress(id, 1), new IdentityKey(bytes)); break;
          default: throw new IllegalStateException("Unknown record");
        }
      }
    }
  }

  private void save(String table, String id, byte[] value) { put(object(state, table), id, encode(value)); }
  @Override public void storePreKey(int id, PreKeyRecord record) { super.storePreKey(id, record); save("prekeys", "" + id, record.serialize()); }
  @Override public void removePreKey(int id) { super.removePreKey(id); object(state, "prekeys").remove("" + id); }
  @Override public void storeSignedPreKey(int id, SignedPreKeyRecord record) { super.storeSignedPreKey(id, record); save("signed", "" + id, record.serialize()); }
  @Override public void storeKyberPreKey(int id, KyberPreKeyRecord record) { super.storeKyberPreKey(id, record); save("kyber", "" + id, record.serialize()); }
  @Override public void storeSession(SignalProtocolAddress address, SessionRecord record) { super.storeSession(address, record); save("sessions", address.getName(), record.serialize()); }
  @Override public IdentityChange saveIdentity(SignalProtocolAddress address, IdentityKey identity) {
    if (!isTrustedIdentity(address, identity, Direction.SENDING)) throw new IllegalStateException("Peer identity changed");
    IdentityChange result = super.saveIdentity(address, identity);
    save("identities", address.getName(), identity.serialize());
    return result;
  }
  @Override public void markKyberPreKeyUsed(int id, int signedId, ECPublicKey baseKey) throws ReusedBaseKeyException {
    JSONObject seen = object(state, "usedKyber");
    String token = id + ":" + signedId + ":" + encode(baseKey.serialize());
    if (seen.has(token)) throw new ReusedBaseKeyException();
    put(seen, token, true);
    // Retain last-resort keys and replay evidence across restarts.
    if (id != state.optInt("lastResortId")) {
      put(object(state, "consumedKyber"), "" + id, true);
    }
  }
  @Override public KyberPreKeyRecord loadKyberPreKey(int id) throws org.signal.libsignal.protocol.InvalidKeyIdException {
    if (object(state, "consumedKyber").has("" + id)) throw new org.signal.libsignal.protocol.InvalidKeyIdException("Consumed one-time key");
    return super.loadKyberPreKey(id);
  }
}
