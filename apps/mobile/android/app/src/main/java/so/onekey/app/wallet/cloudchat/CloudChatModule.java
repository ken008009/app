package so.onekey.app.wallet.cloudchat;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;
import so.onekey.app.wallet.BuildConfig;

public final class CloudChatModule extends ReactContextBaseJavaModule {
  // Shared by main/bg module instances, including during React context recreation.
  private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();
  public CloudChatModule(ReactApplicationContext context) { super(context); }
  @Override public String getName() { return "CloudChatSignal"; }
  @Override public java.util.Map<String, Object> getConstants() {
    return java.util.Collections.singletonMap("localApiBaseUrl", BuildConfig.CLOUD_CHAT_LOCAL_API_URL);
  }

  @ReactMethod
  public void execute(String scope, String operation, String arguments, Promise promise) {
    EXECUTOR.execute(() -> {
      try {
        if (scope.length() > 2048 || arguments.length() > 1048576) throw new IllegalArgumentException("Request too large");
        CloudChatVault vault = new CloudChatVault(getReactApplicationContext(), scope);
        JSONObject state = vault.read();
        Object result = new CloudChatEngine(state).execute(operation, new JSONObject(arguments));
        // Ratchet state, plaintext, replay ledger and ACK/outbox records commit together.
        // Exceptions discard the transaction-local state; no plaintext escapes on failure.
        if (!java.util.Arrays.asList("getAuth", "registration", "pendingUpload", "list", "conversation", "outbox", "pendingAcknowledgements", "fingerprints").contains(operation)) {
          vault.write(state);
        }
        promise.resolve(result == null ? "null" : result.toString());
      } catch (Exception | LinkageError error) {
        // Native exception strings can contain message bytes. Never bridge or log them.
        promise.reject("CLOUD_CHAT_SIGNAL", "云聊加密或安全存储操作失败，请勿重置密钥；检查设备身份和应用版本");
      }
    });
  }
}
