package so.onekey.app.wallet.cloudchat;

import static so.onekey.app.wallet.cloudchat.CloudChatSignalStore.*;

import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Iterator;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;
import org.signal.libsignal.protocol.IdentityKey;
import org.signal.libsignal.protocol.IdentityKeyPair;
import org.signal.libsignal.protocol.SessionBuilder;
import org.signal.libsignal.protocol.SessionCipher;
import org.signal.libsignal.protocol.SignalProtocolAddress;
import org.signal.libsignal.protocol.ecc.ECKeyPair;
import org.signal.libsignal.protocol.ecc.ECPublicKey;
import org.signal.libsignal.protocol.kem.KEMKeyPair;
import org.signal.libsignal.protocol.kem.KEMKeyType;
import org.signal.libsignal.protocol.kem.KEMPublicKey;
import org.signal.libsignal.protocol.message.CiphertextMessage;
import org.signal.libsignal.protocol.message.PreKeySignalMessage;
import org.signal.libsignal.protocol.message.SignalMessage;
import org.signal.libsignal.protocol.state.KyberPreKeyRecord;
import org.signal.libsignal.protocol.state.PreKeyBundle;
import org.signal.libsignal.protocol.state.PreKeyRecord;
import org.signal.libsignal.protocol.state.SignedPreKeyRecord;
import org.signal.libsignal.protocol.util.KeyHelper;

/** Only public bundles, ciphertexts and UI messages leave this transaction boundary. */
final class CloudChatEngine {
  private final JSONObject state;
  CloudChatEngine(JSONObject state) { this.state = state; }

  private static String uuid(String value) {
    if (!UUID.fromString(value).toString().equals(value)) throw new IllegalArgumentException("Invalid service ID");
    return value;
  }
  private static SignalProtocolAddress address(String value) { return new SignalProtocolAddress(uuid(value), 1); }
  private CloudChatSignalStore store() throws Exception { return new CloudChatSignalStore(state); }
  private SignalProtocolAddress local() throws Exception { return address(state.getString("serviceId")); }
  private int nextKey() throws Exception {
    int value = state.optInt("nextKey", 1);
    if (value >= 0xFFFFFF) throw new IllegalStateException("Key identifiers exhausted");
    state.put("nextKey", value + 1);
    return value;
  }
  private static JSONObject publicKey(int id, byte[] key, byte[] signature) throws Exception {
    JSONObject result = new JSONObject().put("key_id", id).put("public_key", encode(key));
    if (signature != null) result.put("signature", encode(signature));
    return result;
  }
  private JSONObject kyber(CloudChatSignalStore store) throws Exception {
    int id = nextKey();
    KEMKeyPair pair = KEMKeyPair.generate(KEMKeyType.KYBER_1024);
    byte[] signature = store.getIdentityKeyPair().getPrivateKey().calculateSignature(pair.getPublicKey().serialize());
    store.storeKyberPreKey(id, new KyberPreKeyRecord(id, System.currentTimeMillis(), pair, signature));
    return publicKey(id, pair.getPublicKey().serialize(), signature);
  }

  private JSONObject upload(int ecCount, int pqCount) throws Exception {
    if (state.has("pendingUpload")) return state.getJSONObject("pendingUpload");
    if (ecCount < 0 || ecCount > 100 || pqCount < 0 || pqCount > 50) throw new IllegalArgumentException("Invalid batch size");
    if (!state.has("identity")) {
      state.put("identity", encode(IdentityKeyPair.generate().serialize()));
      state.put("registration", KeyHelper.generateRegistrationId(false));
    }
    CloudChatSignalStore store = store();
    if (!state.has("signedPublic")) {
      int id = nextKey();
      ECKeyPair pair = ECKeyPair.generate();
      byte[] signature = store.getIdentityKeyPair().getPrivateKey().calculateSignature(pair.getPublicKey().serialize());
      store.storeSignedPreKey(id, new SignedPreKeyRecord(id, System.currentTimeMillis(), pair, signature));
      state.put("signedPublic", publicKey(id, pair.getPublicKey().serialize(), signature));
      JSONObject fallback = kyber(store);
      state.put("lastResortId", fallback.getInt("key_id"));
      state.put("lastResortPublic", fallback);
    }
    JSONArray ec = new JSONArray();
    JSONArray pq = new JSONArray();
    for (int i = 0; i < ecCount; i++) {
      int id = nextKey();
      ECKeyPair pair = ECKeyPair.generate();
      store.storePreKey(id, new PreKeyRecord(id, pair));
      ec.put(publicKey(id, pair.getPublicKey().serialize(), null));
    }
    for (int i = 0; i < pqCount; i++) pq.put(kyber(store));
    JSONObject result = new JSONObject().put("device_id", 1).put("registration_id", store.getLocalRegistrationId())
        .put("identity_key", encode(store.getIdentityKeyPair().getPublicKey().serialize()))
        .put("client_library", "org.signal:libsignal-android@0.102.1")
        .put("signed_pre_key", state.getJSONObject("signedPublic"))
        .put("pq_last_resort_pre_key", state.getJSONObject("lastResortPublic"))
        .put("pre_keys", ec).put("pq_pre_keys", pq);
    state.put("pendingUpload", result);
    return result;
  }

  private JSONObject conversation(String peer) throws Exception {
    JSONObject conversations = object(state, "conversations");
    Iterator<String> ids = conversations.keys();
    while (ids.hasNext()) {
      JSONObject item = conversations.getJSONObject(ids.next());
      if (peer.equals(item.getString("peerUserId")) || peer.equals(item.getString("peerServiceId"))) return item;
    }
    return null;
  }
  private JSONObject addPeer(String peer, String serviceId) throws Exception {
    uuid(serviceId);
    if (serviceId.equals(state.optString("serviceId"))) throw new IllegalArgumentException("Cannot message self");
    JSONObject existing = conversation(serviceId);
    if (existing != null) {
      existing.put("peerUserId", peer);
      return existing;
    }
    JSONObject result = new JSONObject().put("id", serviceId).put("peerUserId", peer).put("peerServiceId", serviceId)
        .put("lastMessagePreview", "").put("lastMessageAt", System.currentTimeMillis())
        .put("unreadCount", 0).put("messages", new JSONArray());
    object(state, "conversations").put(serviceId, result);
    return result;
  }
  private JSONObject requireConversation(String peer) throws Exception {
    JSONObject result = conversation(peer);
    if (result == null) throw new IllegalArgumentException("Contact unavailable");
    return result;
  }
  private void append(JSONObject conversation, JSONObject message, boolean unread) throws Exception {
    JSONArray messages = conversation.getJSONArray("messages");
    // Fail closed rather than silently deleting local-only history.
    if (messages.length() >= 10000) throw new IllegalStateException("Conversation storage limit reached");
    messages.put(message);
    conversation.put("lastMessagePreview", message.getString("text"));
    conversation.put("lastMessageAt", message.getLong("createdAt"));
    if (unread) conversation.put("unreadCount", conversation.getInt("unreadCount") + 1);
  }
  private void processBundle(JSONObject bundle, String peer) throws Exception {
    if (!bundle.getString("service_id").equals(peer) || bundle.getInt("device_id") != 1) throw new IllegalArgumentException("Wrong recipient bundle");
    JSONObject ec = bundle.optJSONObject("pre_key");
    JSONObject signed = bundle.getJSONObject("signed_pre_key");
    JSONObject pq = bundle.getJSONObject("pq_pre_key");
    CloudChatSignalStore store = store();
    PreKeyBundle prekey = new PreKeyBundle(bundle.getInt("registration_id"), 1,
        ec == null ? -1 : ec.getInt("key_id"), ec == null ? null : new ECPublicKey(decode(ec.getString("public_key"))),
        signed.getInt("key_id"), new ECPublicKey(decode(signed.getString("public_key"))), decode(signed.getString("signature")),
        new IdentityKey(decode(bundle.getString("identity_key"))), pq.getInt("key_id"),
        new KEMPublicKey(decode(pq.getString("public_key"))), decode(pq.getString("signature")));
    new SessionBuilder(store, address(peer), local()).process(prekey);
    object(state, "claims").remove(peer);
  }
  private JSONObject queueMessage(String peer, String text) throws Exception {
    byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
    if (text.trim().isEmpty() || bytes.length > 16000) throw new IllegalArgumentException("Message must be 1–16000 UTF-8 bytes");
    JSONObject outbox = object(state, "outbox");
    if (outbox.length() >= 500) throw new IllegalStateException("Outbox is full");
    JSONObject conversation = requireConversation(peer);
    SessionCipher cipher = new SessionCipher(store(), local(), address(conversation.getString("peerServiceId")));
    CiphertextMessage ciphertext = cipher.encrypt(bytes);
    String type;
    if (ciphertext.getType() == CiphertextMessage.PREKEY_TYPE) type = "prekey";
    else if (ciphertext.getType() == CiphertextMessage.WHISPER_TYPE) type = "whisper";
    else throw new IllegalStateException("Unsupported ciphertext type");
    String id = UUID.randomUUID().toString();
    JSONObject body = new JSONObject().put("recipient_service_id", conversation.getString("peerServiceId"))
        .put("recipient_device_id", 1).put("recipient_registration_id", cipher.getRemoteRegistrationId())
        .put("client_message_id", id).put("message_type", type).put("ciphertext", encode(ciphertext.serialize()));
    JSONObject message = new JSONObject().put("id", id).put("from", state.getString("selfAddress"))
        .put("to", conversation.getString("peerUserId")).put("text", text).put("createdAt", System.currentTimeMillis()).put("status", "local");
    append(conversation, message, false);
    outbox.put(id, body);
    return message;
  }
  private void receive(JSONObject envelope) throws Exception {
    String id = envelope.getString("id");
    if (!id.matches("[0-9]{1,40}")) throw new IllegalArgumentException("Invalid envelope ID");
    JSONObject received = object(state, "received");
    // Keep a digest to reject a changed envelope masquerading as a retry.
    String sender = uuid(envelope.getString("sender_service_id"));
    if (envelope.getInt("sender_device_id") != 1) throw new IllegalArgumentException("Unsupported device");
    String messageId = uuid(envelope.getString("client_message_id"));
    String type = envelope.getString("message_type");
    byte[] ciphertext = decode(envelope.getString("ciphertext"));
    if (ciphertext.length < 1 || ciphertext.length > 65536) throw new IllegalArgumentException("Invalid ciphertext length");
    String digest = CloudChatVault.hex(MessageDigest.getInstance("SHA-256").digest(
        (sender + "\n" + messageId + "\n" + type + "\n" + encode(ciphertext)).getBytes(StandardCharsets.UTF_8)));
    String dedup = sender + ":" + messageId;
    if (received.has(id) || received.has(dedup)) {
      if (!digest.equals(received.optString(id, received.optString(dedup)))) throw new IllegalStateException("Envelope conflict");
      object(state, "pendingAcknowledgements").put(id, true);
      return;
    }
    SessionCipher cipher = new SessionCipher(store(), local(), address(sender));
    byte[] plaintext;
    if (type.equals("prekey")) plaintext = cipher.decrypt(new PreKeySignalMessage(ciphertext));
    else if (type.equals("whisper")) plaintext = cipher.decrypt(new SignalMessage(ciphertext));
    else throw new IllegalArgumentException("Unsupported ciphertext type");
    if (plaintext.length > 16000) throw new IllegalArgumentException("Oversized plaintext");
    String text = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(plaintext)).toString();
    JSONObject conversation = conversation(sender);
    if (conversation == null) conversation = addPeer(sender, sender);
    JSONObject message = new JSONObject().put("id", "received:" + id).put("from", conversation.getString("peerUserId"))
        .put("to", state.getString("selfAddress")).put("text", text).put("createdAt", System.currentTimeMillis()).put("status", "received");
    append(conversation, message, true);
    received.put(id, digest).put(dedup, digest);
    object(state, "pendingAcknowledgements").put(id, true);
  }

  Object execute(String op, JSONObject args) throws Exception {
    switch (op) {
      case "getAuth": return state.optJSONObject("auth");
      case "setAuth":
        if (args.isNull("session")) state.remove("auth");
        else state.put("auth", args.getJSONObject("session"));
        return null;
      case "bind":
        String serviceId = uuid(args.getString("serviceId"));
        if (state.has("serviceId") && !serviceId.equals(state.getString("serviceId"))) throw new IllegalStateException("Account identity changed");
        state.put("serviceId", serviceId).put("selfAddress", args.getString("address"));
        return null;
      case "registration": return state.optInt("registration", 0);
      case "pendingUpload": return state.optJSONObject("pendingUpload");
      case "upload": return upload(args.getInt("ec"), args.getInt("pq"));
      case "uploaded": state.remove("pendingUpload"); return null;
      case "addPeer": return addPeer(args.getString("address"), args.getString("serviceId"));
      case "list":
        JSONArray list = new JSONArray();
        JSONObject conversations = object(state, "conversations");
        Iterator<String> ids = conversations.keys();
        while (ids.hasNext()) {
          JSONObject item = new JSONObject(conversations.getJSONObject(ids.next()).toString());
          item.put("messages", new JSONArray());
          list.put(item);
        }
        return list;
      case "conversation": return conversation(args.getString("peer"));
      case "read":
        JSONObject item = conversation(args.getString("peer"));
        if (item != null) item.put("unreadCount", 0);
        return null;
      case "claim":
        String peer = requireConversation(args.getString("peer")).getString("peerServiceId");
        if (store().containsSession(address(peer))) return null;
        JSONObject claims = object(state, "claims");
        if (!claims.has(peer)) claims.put(peer, UUID.randomUUID().toString());
        return new JSONObject().put("service_id", peer).put("device_id", 1).put("request_id", claims.getString(peer));
      case "bundle": processBundle(args.getJSONObject("bundle"), args.getString("peer")); return null;
      case "send": return queueMessage(args.getString("peer"), args.getString("text"));
      case "outbox":
        JSONArray queue = new JSONArray();
        JSONObject outbox = object(state, "outbox");
        Iterator<String> outgoing = outbox.keys();
        while (outgoing.hasNext()) {
          String id = outgoing.next();
          if (!object(state, "rejected").has(id)) queue.put(outbox.getJSONObject(id));
        }
        return queue;
      case "rejected":
        String rejectedId = args.getString("id");
        JSONObject rejectedBody = object(state, "outbox").optJSONObject(rejectedId);
        if (rejectedBody == null) return null;
        object(state, "rejected").put(rejectedId, true);
        JSONArray rejectedMessages = requireConversation(rejectedBody.getString("recipient_service_id")).getJSONArray("messages");
        for (int i = 0; i < rejectedMessages.length(); i++) {
          JSONObject message = rejectedMessages.getJSONObject(i);
          if (rejectedId.equals(message.getString("id"))) message.put("status", "failed");
        }
        return null;
      case "retry":
        JSONObject retryConversation = requireConversation(args.getString("peer"));
        JSONArray retryMessages = retryConversation.getJSONArray("messages");
        for (int i = 0; i < retryMessages.length(); i++) {
          JSONObject message = retryMessages.getJSONObject(i);
          if ("failed".equals(message.getString("status"))) {
            object(state, "rejected").remove(message.getString("id"));
            message.put("status", "local");
          }
        }
        return null;
      case "sent":
        String messageId = args.getString("id");
        JSONObject pending = object(state, "outbox").optJSONObject(messageId);
        if (pending == null) return null;
        JSONArray messages = requireConversation(pending.getString("recipient_service_id")).getJSONArray("messages");
        for (int i = 0; i < messages.length(); i++) {
          JSONObject message = messages.getJSONObject(i);
          if (messageId.equals(message.getString("id"))) message.put("status", "sent");
        }
        object(state, "outbox").remove(messageId);
        return null;
      case "receive": receive(args.getJSONObject("envelope")); return null;
      case "pendingAcknowledgements": return object(state, "pendingAcknowledgements").names() == null ? new JSONArray() : object(state, "pendingAcknowledgements").names();
      case "acknowledged":
        JSONArray acknowledged = args.getJSONArray("ids");
        for (int i = 0; i < acknowledged.length(); i++) object(state, "pendingAcknowledgements").remove(acknowledged.getString(i));
        return null;
      case "fingerprints":
        CloudChatSignalStore store = store();
        String other = requireConversation(args.getString("peer")).getString("peerServiceId");
        IdentityKey identity = store.getIdentity(address(other));
        return new JSONObject().put("self", CloudChatVault.hex(MessageDigest.getInstance("SHA-256").digest(store.getIdentityKeyPair().getPublicKey().serialize())))
            .put("peer", identity == null ? "" : CloudChatVault.hex(MessageDigest.getInstance("SHA-256").digest(identity.serialize())));
      default: throw new IllegalArgumentException("Unsupported operation");
    }
  }
}
