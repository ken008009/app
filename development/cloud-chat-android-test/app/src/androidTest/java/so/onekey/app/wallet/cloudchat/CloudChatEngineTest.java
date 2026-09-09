package so.onekey.app.wallet.cloudchat;

import static org.junit.Assert.*;
import android.content.Context;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class CloudChatEngineTest {
  private static final String ALICE = "00000000-0000-4000-8000-000000000001";
  private static final String BOB = "00000000-0000-4000-8000-000000000002";
  private final Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();

  private CloudChatVault vault(String id) throws Exception { return new CloudChatVault(context, "test-" + UUID.randomUUID() + "\n" + id); }
  private Object tx(CloudChatVault vault, String op, JSONObject args) throws Exception {
    JSONObject state = vault.read();
    Object result = new CloudChatEngine(state).execute(op, args);
    vault.write(state);
    return result;
  }
  private Object tx(CloudChatVault vault, String op) throws Exception { return tx(vault, op, new JSONObject()); }
  private JSONObject init(CloudChatVault vault, String id) throws Exception {
    tx(vault, "bind", new JSONObject().put("serviceId", id).put("address", id));
    return (JSONObject) tx(vault, "upload", new JSONObject().put("ec", 3).put("pq", 3));
  }
  private JSONObject bundle(JSONObject upload, String id, boolean fallback) throws Exception {
    return new JSONObject().put("service_id", id).put("device_id", 1)
        .put("registration_id", upload.getInt("registration_id")).put("identity_key", upload.getString("identity_key"))
        .put("signed_pre_key", upload.getJSONObject("signed_pre_key"))
        .put("pre_key", fallback ? JSONObject.NULL : upload.getJSONArray("pre_keys").getJSONObject(0))
        .put("pq_pre_key", fallback ? upload.getJSONObject("pq_last_resort_pre_key") : upload.getJSONArray("pq_pre_keys").getJSONObject(0));
  }
  private void peer(CloudChatVault vault, String id) throws Exception { tx(vault, "addPeer", new JSONObject().put("address", id).put("serviceId", id)); }
  private JSONObject send(CloudChatVault vault, String id, String text) throws Exception {
    JSONObject message = (JSONObject) tx(vault, "send", new JSONObject().put("peer", id).put("text", text));
    JSONArray outbox = (JSONArray) tx(vault, "outbox");
    for (int i = 0; i < outbox.length(); i++) if (message.getString("id").equals(outbox.getJSONObject(i).getString("client_message_id"))) return outbox.getJSONObject(i);
    throw new AssertionError("Missing durable outbox item");
  }
  private JSONObject envelope(JSONObject body, String sender, String id) throws Exception {
    return new JSONObject().put("id", id).put("sender_service_id", sender).put("sender_device_id", 1)
        .put("client_message_id", body.getString("client_message_id")).put("message_type", body.getString("message_type"))
        .put("ciphertext", body.getString("ciphertext")).put("created_at", "2026-09-09T00:00:00Z");
  }
  private void receive(CloudChatVault vault, JSONObject envelope) throws Exception { tx(vault, "receive", new JSONObject().put("envelope", envelope)); }

  @Test public void roundTripReloadDedupAndAtomicFailure() throws Exception {
    CloudChatVault alice = vault(ALICE), bob = vault(BOB);
    init(alice, ALICE);
    JSONObject bobKeys = init(bob, BOB);
    peer(alice, BOB);
    tx(alice, "bundle", new JSONObject().put("peer", BOB).put("bundle", bundle(bobKeys, BOB, false)));
    JSONObject outgoing = send(alice, BOB, "你好，Signal");
    // Reload on every tx; no in-memory ratchet is relied upon.
    assertTrue(((JSONArray) tx(alice, "outbox")).getJSONObject(0).toString().equals(outgoing.toString()));
    JSONObject incoming = envelope(outgoing, ALICE, "1");
    JSONObject bad = new JSONObject(incoming.toString()).put("ciphertext", CloudChatSignalStore.encode(new byte[50]));
    boolean rejected = false;
    try { receive(bob, bad); } catch (Exception expected) { rejected = true; }
    assertTrue("Tampered ciphertext must be rejected", rejected);
    assertTrue(((JSONArray) tx(bob, "pendingAcknowledgements")).length() == 0);
    receive(bob, incoming);
    receive(bob, incoming);
    JSONObject conversation = (JSONObject) tx(bob, "conversation", new JSONObject().put("peer", ALICE));
    assertTrue(conversation.getJSONArray("messages").length() == 1);
    assertTrue(conversation.getJSONArray("messages").getJSONObject(0).getString("text").equals("你好，Signal"));
    assertTrue(((JSONArray) tx(bob, "pendingAcknowledgements")).length() == 1);
    JSONObject reply = send(bob, ALICE, "收到");
    receive(alice, envelope(reply, BOB, "2"));
    JSONObject fingerprintsA = (JSONObject) tx(alice, "fingerprints", new JSONObject().put("peer", BOB));
    JSONObject fingerprintsB = (JSONObject) tx(bob, "fingerprints", new JSONObject().put("peer", ALICE));
    assertTrue(fingerprintsA.getString("peer").equals(fingerprintsB.getString("self")));
    assertTrue(fingerprintsB.getString("peer").equals(fingerprintsA.getString("self")));
    JSONObject second = send(alice, BOB, "断网时排队");
    receive(bob, envelope(second, ALICE, "3"));
    tx(bob, "acknowledged", new JSONObject().put("ids", new JSONArray().put("1").put("3")));
    assertTrue(((JSONArray) tx(bob, "pendingAcknowledgements")).length() == 0);
  }

  @Test public void fallbackPrekeysAndChangedIdentity() throws Exception {
    CloudChatVault alice = vault(ALICE), bob = vault(BOB);
    init(alice, ALICE);
    JSONObject keys = init(bob, BOB);
    peer(alice, BOB);
    tx(alice, "bundle", new JSONObject().put("peer", BOB).put("bundle", bundle(keys, BOB, true)));
    receive(bob, envelope(send(alice, BOB, "后备密钥"), ALICE, "5"));
    JSONObject newKeys = init(vault(BOB), BOB);
    boolean rejected = false;
    try { tx(alice, "bundle", new JSONObject().put("peer", BOB).put("bundle", bundle(newKeys, BOB, false))); }
    catch (Exception expected) { rejected = true; }
    assertTrue("Changed identity must not be silently trusted", rejected);
    // Upload retry retains exactly the same keys and identifiers.
    assertTrue(keys.toString().equals(((JSONObject) tx(bob, "upload", new JSONObject().put("ec", 3).put("pq", 3))).toString()));
  }

  private JSONObject request(String base, String path, String method, String token, JSONObject body) throws Exception {
    HttpURLConnection connection = (HttpURLConnection) new URL(base + path).openConnection();
    connection.setConnectTimeout(20000); connection.setReadTimeout(20000);
    connection.setRequestMethod(method);
    if (token != null) connection.setRequestProperty("Authorization", "Bearer " + token);
    if (body != null) {
      connection.setDoOutput(true); connection.setRequestProperty("Content-Type", "application/json");
      try (java.io.OutputStream stream = connection.getOutputStream()) { stream.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
    }
    try {
      if (connection.getResponseCode() != 200) throw new IllegalStateException("Test HTTP status " + connection.getResponseCode());
      try (java.io.InputStream stream = connection.getInputStream(); java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream()) {
        byte[] buffer = new byte[4096]; int count;
        while ((count = stream.read(buffer)) != -1) bytes.write(buffer, 0, count);
        return new JSONObject(bytes.toString("UTF-8"));
      }
    } finally { connection.disconnect(); }
  }

  @Test public void realBackendCiphertextAndAcknowledgement() throws Exception {
    org.junit.Assume.assumeTrue("true".equals(InstrumentationRegistry.getArguments().getString("cloudChatLive")));
    JSONObject a = request("http://127.0.0.1:18791", "/alice", "GET", null, null);
    JSONObject b = request("http://127.0.0.1:18791", "/bob", "GET", null, null);
    String base = a.getString("base"), aId = a.getString("serviceId"), bId = b.getString("serviceId");
    String aToken = a.getString("token"), bToken = b.getString("token");
    CloudChatVault alice = vault(aId), bob = vault(bId);
    JSONObject aKeys = init(alice, aId), bKeys = init(bob, bId);
    request(base, "/v1/signal/keys", "PUT", aToken, aKeys);
    request(base, "/v1/signal/keys", "PUT", bToken, bKeys);
    tx(alice, "uploaded"); tx(bob, "uploaded");
    peer(alice, bId);
    JSONObject claim = (JSONObject) tx(alice, "claim", new JSONObject().put("peer", bId));
    JSONObject bundle = request(base, "/v1/signal/prekeys/claim", "POST", aToken, claim);
    assertTrue(bundle.toString().equals(request(base, "/v1/signal/prekeys/claim", "POST", aToken, claim).toString()));
    tx(alice, "bundle", new JSONObject().put("peer", bId).put("bundle", bundle));
    JSONObject body = send(alice, bId, "真实后端互通");
    JSONObject sent = request(base, "/v1/signal/messages", "POST", aToken, body);
    assertTrue(sent.getString("id").equals(request(base, "/v1/signal/messages", "POST", aToken, body).getString("id")));
    tx(alice, "sent", new JSONObject().put("id", body.getString("client_message_id")));
    JSONArray inbox = request(base, "/v1/signal/messages?limit=50", "GET", bToken, null).getJSONArray("messages");
    assertTrue(inbox.length() == 1);
    receive(bob, inbox.getJSONObject(0)); receive(bob, inbox.getJSONObject(0));
    JSONArray ack = (JSONArray) tx(bob, "pendingAcknowledgements");
    request(base, "/v1/signal/messages/ack", "POST", bToken, new JSONObject().put("ids", ack));
    request(base, "/v1/signal/messages/ack", "POST", bToken, new JSONObject().put("ids", ack));
    tx(bob, "acknowledged", new JSONObject().put("ids", ack));
    assertTrue(request(base, "/v1/signal/messages?limit=50", "GET", bToken, null).getJSONArray("messages").length() == 0);
    JSONObject reply = send(bob, aId, "真实回复");
    request(base, "/v1/signal/messages", "POST", bToken, reply);
    JSONArray aInbox = request(base, "/v1/signal/messages?limit=50", "GET", aToken, null).getJSONArray("messages");
    receive(alice, aInbox.getJSONObject(0));
    request(base, "/v1/signal/messages/ack", "POST", aToken, new JSONObject().put("ids", tx(alice, "pendingAcknowledgements")));
    request(base, "/v1/auth/logout", "POST", aToken, null);
    request(base, "/v1/auth/logout", "POST", bToken, null);
  }

  @Test public void twoDeviceExchange() throws Exception {
    String role = InstrumentationRegistry.getArguments().getString("cloudChatRole");
    org.junit.Assume.assumeTrue("alice".equals(role) || "bob".equals(role));
    boolean initiator = "alice".equals(role);
    JSONObject self = request("http://127.0.0.1:18791", "/" + role, "GET", null, null);
    JSONObject remote = request("http://127.0.0.1:18791", initiator ? "/bob" : "/alice", "GET", null, null);
    String base = self.getString("base"), selfId = self.getString("serviceId"), remoteId = remote.getString("serviceId");
    String token = self.getString("token");
    CloudChatVault vault = vault(selfId);
    JSONObject keys = init(vault, selfId);
    request(base, "/v1/signal/keys", "PUT", token, keys);
    request(base, "/v1/signal/keys", "PUT", token, keys);
    tx(vault, "uploaded");
    peer(vault, remoteId);
    if (initiator) {
      JSONObject claim = (JSONObject) tx(vault, "claim", new JSONObject().put("peer", remoteId));
      JSONObject bundle = null;
      for (int i = 0; i < 90 && bundle == null; i++) {
        try { bundle = request(base, "/v1/signal/prekeys/claim", "POST", token, claim); }
        catch (IllegalStateException error) {
          if (!"Test HTTP status 404".equals(error.getMessage())) throw error;
          Thread.sleep(2000);
        }
      }
      assertNotNull("Other device did not register keys", bundle);
      tx(vault, "bundle", new JSONObject().put("peer", remoteId).put("bundle", bundle));
      JSONObject body = send(vault, remoteId, "跨设备加密测试");
      JSONObject accepted = request(base, "/v1/signal/messages", "POST", token, body);
      assertTrue(accepted.getString("id").equals(request(base, "/v1/signal/messages", "POST", token, body).getString("id")));
      tx(vault, "sent", new JSONObject().put("id", body.getString("client_message_id")));
    }
    JSONArray inbox = new JSONArray();
    for (int i = 0; i < 90 && inbox.length() == 0; i++) {
      inbox = request(base, "/v1/signal/messages?limit=50", "GET", token, null).getJSONArray("messages");
      if (inbox.length() == 0) Thread.sleep(2000);
    }
    assertTrue("Other device did not send a ciphertext", inbox.length() == 1);
    receive(vault, inbox.getJSONObject(0));
    receive(vault, inbox.getJSONObject(0));
    JSONObject conversation = (JSONObject) tx(vault, "conversation", new JSONObject().put("peer", remoteId));
    assertTrue(conversation.getJSONArray("messages").length() == (initiator ? 2 : 1));
    JSONArray acknowledgements = (JSONArray) tx(vault, "pendingAcknowledgements");
    request(base, "/v1/signal/messages/ack", "POST", token, new JSONObject().put("ids", acknowledgements));
    request(base, "/v1/signal/messages/ack", "POST", token, new JSONObject().put("ids", acknowledgements));
    tx(vault, "acknowledged", new JSONObject().put("ids", acknowledgements));
    if (!initiator) {
      JSONObject reply = send(vault, remoteId, "跨设备回复成功");
      request(base, "/v1/signal/messages", "POST", token, reply);
      tx(vault, "sent", new JSONObject().put("id", reply.getString("client_message_id")));
    }
    assertTrue(request(base, "/v1/signal/messages?limit=50", "GET", token, null).getJSONArray("messages").length() == 0);
    request(base, "/v1/auth/logout", "POST", token, null);
  }
}
