import UIKit
import WebKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = UygulamaViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/// Capacitor yarım kalan her sayfa yüklemesinde çevrimdışı sayfasını
/// (server.errorPath) açıyor. Yükleme başka bir yüklemeyle kesildiğinde
/// (ör. art arda iki dokunuş) internet varken "bağlantı yok" görünüyordu;
/// kesintiler araya giren delegede yutulur, gerçek hatalar Capacitor'a gider.
class UygulamaViewController: CAPBridgeViewController {
    private var suzgec: KesintiSuzgeci?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // Ekranın sol kenarından sağa kaydırınca önceki sayfa (iOS'taki gibi);
        // sitenin uygulama içi geçişleri de geçmişe yazıldığı için onlarda da çalışır.
        webView?.allowsBackForwardNavigationGestures = true
        guard let web = webView, let asil = web.navigationDelegate else { return }
        let s = KesintiSuzgeci(asil: asil)
        suzgec = s // WKWebView delegesini zayıf tutar
        web.navigationDelegate = s
    }
}

final class KesintiSuzgeci: NSObject, WKNavigationDelegate {
    private let asil: WKNavigationDelegate

    init(asil: WKNavigationDelegate) {
        self.asil = asil
    }

    // Burada yazılmayan her delege yöntemi Capacitor'un kendi delegesine gider.
    override func responds(to aSelector: Selector!) -> Bool {
        super.responds(to: aSelector) || asil.responds(to: aSelector)
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        asil.responds(to: aSelector) ? asil : nil
    }

    private func kesinti(_ hata: Error) -> Bool {
        let h = hata as NSError
        return (h.domain == NSURLErrorDomain && h.code == URLError.Code.cancelled.rawValue)
            || (h.domain == "WebKitErrorDomain" && h.code == 102) // Frame load interrupted
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if kesinti(error) { return }
        asil.webView?(webView, didFailProvisionalNavigation: navigation, withError: error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if kesinti(error) { return }
        asil.webView?(webView, didFail: navigation, withError: error)
    }
}
