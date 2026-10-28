import SwiftUI
import WebKit

@MainActor final class JourneyWebBridge: ObservableObject {
    weak var webView: WKWebView?
    func setActive(_ active: Bool) {
        webView?.callAsyncJavaScript("window.dispatchEvent(new CustomEvent('journey-host-active', {detail: active}))", arguments: ["active": active], in: nil, in: .page) { _ in }
    }
    func preferenceResult(requestID: String, ok: Bool, message: String) {
        webView?.callAsyncJavaScript("window.__journeyPreferenceResult?.(result)", arguments: ["result": ["requestID": requestID, "ok": ok, "message": message]], in: nil, in: .page) { _ in }
    }
    func applyPriority(_ priority: String) {
        guard ["business", "earliest"].contains(priority) else { return }
        webView?.callAsyncJavaScript("window.__journeyPriorityReceive?.(priority)", arguments: ["priority": priority], in: nil, in: .page) { _ in }
    }
}

struct JourneyWebView: UIViewRepresentable {
    let bridge: JourneyWebBridge
    let payload: [String: Any]
    let onMessage: ([String: Any]) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(onMessage: onMessage) }
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(context.coordinator, name: "journey")
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = context.coordinator
        view.isOpaque = false
        view.backgroundColor = .clear
        view.scrollView.isScrollEnabled = false
        view.scrollView.contentInsetAdjustmentBehavior = .never
        bridge.webView = view
        guard let url = Bundle.main.url(forResource: "journey", withExtension: "html") else {
            view.loadHTMLString("<p>The journey bundle is missing. Run the bundle script and rebuild.</p>", baseURL: nil)
            return view
        }
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "native", value: "1")]
        view.loadFileURL(components.url!, allowingReadAccessTo: url.deletingLastPathComponent())
        return view
    }
    func updateUIView(_ view: WKWebView, context: Context) {
        context.coordinator.payload = payload
        context.coordinator.send(to: view)
    }
    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        view.configuration.userContentController.removeScriptMessageHandler(forName: "journey")
        view.navigationDelegate = nil
    }
    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        let onMessage: ([String: Any]) -> Void
        var loaded = false
        var payload: [String: Any] = [:]
        init(onMessage: @escaping ([String: Any]) -> Void) { self.onMessage = onMessage }
        func send(to view: WKWebView) {
            guard loaded else { return }
            view.callAsyncJavaScript("window.__journeyNativeReceive?.(snapshot)", arguments: ["snapshot": payload], in: nil, in: .page) { _ in }
        }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { loaded = true; send(to: webView) }
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true,
                  let body = message.body as? [String: Any] else { return }
            onMessage(body)
        }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
            if url.isFileURL { decisionHandler(.allow); return }
            decisionHandler(.cancel)
            // Provider links open outside the privileged local web view.
            if navigationAction.navigationType == .linkActivated && url.scheme == "https" { UIApplication.shared.open(url) }
        }
    }
}
