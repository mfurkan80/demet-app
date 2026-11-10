package me.furkansahin.demet;

import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // pencere uygulamanın kendi temasıyla kurulduktan sonra kenardan kenara çiz
        EdgeToEdge.enable(this);
        // Telefonda yazı boyutu çok büyütülmüşse ekranlar taşmasın: sistem ayarını %90-%110 aralığında uygula
        if (bridge != null && bridge.getWebView() != null) {
            WebSettings ws = bridge.getWebView().getSettings();
            float scale = getResources().getConfiguration().fontScale;
            ws.setTextZoom(Math.round(Math.max(0.9f, Math.min(1.1f, scale)) * 100));
            bridge.getWebView().setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
        }
    }
}
