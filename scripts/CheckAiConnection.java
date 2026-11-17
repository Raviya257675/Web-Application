import java.net.URI;
import java.net.http.*;
import java.time.Duration;
class CheckAiConnection {
  public static void main(String[] args) {
    String key = System.getenv("MERIDIAN_DIAGNOSTIC_KEY");
    if (key == null || key.isBlank()) { System.out.println("AI_KEY_MISSING: No key entered."); return; }
    key = key.strip();
    if (!key.chars().allMatch(c -> c >= 33 && c <= 126)) { System.out.println("AI_KEY_FORMAT: Paste only the API key without spaces or non-ASCII characters."); return; }
    String model = System.getenv().getOrDefault("MERIDIAN_AI_MODEL", "gpt-4.1-mini");
    if (!model.matches("[a-zA-Z0-9._:-]+")) { System.out.println("AI_MODEL: Invalid model setting."); return; }
    try {
      var req = HttpRequest.newBuilder(URI.create("https://api.openai.com/v1/responses"))
        .timeout(Duration.ofSeconds(45)).header("Content-Type", "application/json").header("Authorization", "Bearer " + key)
        .POST(HttpRequest.BodyPublishers.ofString("{\"model\":\"" + model + "\",\"input\":\"Reply with only OK.\",\"max_output_tokens\":16,\"store\":false}")).build();
      var res = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build().send(req, HttpResponse.BodyHandlers.ofString());
      String result = switch (res.statusCode()) {
        case 200 -> res.body().contains("\"output_text\"") ? "AI_OK: Java received a real OpenAI reply. Your key and model work." : "AI_EMPTY: OpenAI returned no text.";
        case 401 -> "AI_KEY_INVALID: OpenAI rejected the key. Enter a valid OpenAI project API key.";
        case 403 -> "AI_ACCESS: Check API project permissions and regional availability.";
        case 404 -> "AI_MODEL: The model is not available to this API project.";
        case 400, 422 -> "AI_REQUEST: OpenAI rejected the request/model settings.";
        case 429 -> res.body().contains("insufficient_quota") || res.body().contains("billing_hard_limit_reached") ? "AI_QUOTA: OpenAI API credits or the project spending limit are exhausted. Check API billing." : "AI_LIMIT: OpenAI rate limit reached. Wait and retry.";
        default -> "AI_PROVIDER: OpenAI returned HTTP " + res.statusCode() + ".";
      };
      System.out.println(result);
    } catch (Exception e) {
      Throwable cause = e;
      while (cause.getCause() != null) cause = cause.getCause();
      // Never print exception text or provider messages: these may contain credential fragments.
      String type = cause.getClass().getSimpleName();
      if (e instanceof javax.net.ssl.SSLException) System.out.println("AI_TLS: Java certificate verification failed (" + type + ").");
      else if (e instanceof HttpTimeoutException) System.out.println("AI_TIMEOUT: OpenAI did not respond within 45 seconds.");
      else System.out.println("AI_NETWORK: Java connection failed (" + type + "). Check DNS, firewall or proxy.");
    }
  }
}
