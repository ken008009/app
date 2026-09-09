package so.onekey.app.wallet.cloudchat;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

/** Process-wide serialization is owned by CloudChatModule, not by either JS heap. */
final class CloudChatVault {
  private final AtomicFile file;
  private final String scope;
  private final String alias;

  CloudChatVault(Context context, String scope) throws Exception {
    this.scope = scope;
    String id = hex(MessageDigest.getInstance("SHA-256").digest(scope.getBytes(StandardCharsets.UTF_8)));
    alias = "cloud-chat-v1-" + id;
    File directory = new File(context.getNoBackupFilesDir(), "cloud-chat-v1");
    if (!directory.isDirectory() && !directory.mkdirs()) throw new IllegalStateException("Storage unavailable");
    file = new AtomicFile(new File(directory, id));
  }

  static String hex(byte[] bytes) {
    StringBuilder result = new StringBuilder();
    for (byte value : bytes) result.append(String.format(java.util.Locale.ROOT, "%02x", value & 255));
    return result.toString();
  }

  private SecretKey key(boolean create) throws Exception {
    KeyStore store = KeyStore.getInstance("AndroidKeyStore");
    store.load(null);
    if (!store.containsAlias(alias)) {
      if (!create) throw new IllegalStateException("Encryption key unavailable; do not reset identity");
      KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
      generator.init(new KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
          .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
          .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
      generator.generateKey();
    }
    return (SecretKey) store.getKey(alias, null);
  }

  JSONObject read() throws Exception {
    if (!file.getBaseFile().exists() && !new File(file.getBaseFile() + ".bak").exists()) return new JSONObject();
    JSONObject envelope = new JSONObject(new String(file.readFully(), StandardCharsets.UTF_8));
    if (envelope.getInt("version") != 1) throw new IllegalStateException("Unsupported vault version");
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.DECRYPT_MODE, key(false), new GCMParameterSpec(128, Base64.decode(envelope.getString("iv"), Base64.NO_WRAP)));
    cipher.updateAAD(scope.getBytes(StandardCharsets.UTF_8));
    return new JSONObject(new String(cipher.doFinal(Base64.decode(envelope.getString("data"), Base64.NO_WRAP)), StandardCharsets.UTF_8));
  }

  void write(JSONObject state) throws Exception {
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.ENCRYPT_MODE, key(true));
    cipher.updateAAD(scope.getBytes(StandardCharsets.UTF_8));
    JSONObject envelope = new JSONObject().put("version", 1)
        .put("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
        .put("data", Base64.encodeToString(cipher.doFinal(state.toString().getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP));
    FileOutputStream stream = null;
    try {
      stream = file.startWrite();
      stream.write(envelope.toString().getBytes(StandardCharsets.UTF_8));
      file.finishWrite(stream);
    } catch (Exception error) {
      if (stream != null) file.failWrite(stream);
      throw error;
    }
  }
}
