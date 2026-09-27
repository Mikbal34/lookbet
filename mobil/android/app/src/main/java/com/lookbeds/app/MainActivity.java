package com.lookbeds.app;

import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

// LookBeds'in Android kabuğu: lookbeds.com'u açar (mobil/capacitor.config.ts).
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Capacitor sunucunun her HTTP hatasında (404, 500…) "internet yok"
        // sayfasını açıyor; iOS'taki gibi sitenin kendi hata sayfası görünsün.
        // Çevrimdışı sayfası yalnız bağlantı kurulamayınca (onReceivedError).
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {}
        });

        // Geri tuşu: sitede geri gidilebiliyorsa önceki sayfa (uygulama içi
        // geçişler de geçmişte), değilse Android'in olağanı: uygulamadan çık.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView web = bridge.getWebView();
                if (web.canGoBack()) {
                    web.goBack();
                    return;
                }
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });
    }
}
