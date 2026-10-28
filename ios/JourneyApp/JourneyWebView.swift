import SwiftUI
import WebKit

@MainActor final class JourneyWebBridge: ObservableObject {
    weak var webView: WKWebView?
    func showInspector() {
        webView?.callAsyncJavaScript("window.dispatchEvent(new Event('journey-open-inspector'))", arguments: [:], in: nil, in: .page) { _ in }
    }
    func showLiveFlights() {
        webView?.callAsyncJavaScript("window.dispatchEvent(new Event('journey-open-live-flights'))", arguments: [:], in: nil, in: .page) { _ in }
    }
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
        private var flightLookupRunning = false
        private var lastFlightLookup = Date.distantPast
        private let flightSession: URLSession = {
            let config = URLSessionConfiguration.ephemeral
            config.httpShouldSetCookies = false
            config.urlCache = nil
            config.timeoutIntervalForRequest = 12
            config.timeoutIntervalForResource = 12
            return URLSession(configuration: config)
        }()
        private func replyFlight(_ result: [String: Any], to view: WKWebView?) {
            view?.callAsyncJavaScript("window.dispatchEvent(new CustomEvent('journey-flight-result', {detail: result}))", arguments: ["result": result], in: nil, in: .page) { _ in }
        }
        private func lookupFlight(_ body: [String: Any], in view: WKWebView?) {
            guard let requestID = body["requestID"] as? String, requestID.count <= 64 else { return }
            guard let query = body["query"] as? [String: Any],
                  let number = query["flightNumber"] as? String,
                  number.range(of: "^[1-9][0-9]{0,3}$", options: .regularExpression) != nil,
                  let date = query["travelDate"] as? String,
                  date.range(of: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$", options: .regularExpression) != nil else {
                replyFlight(["requestID": requestID, "error": "Choose a Cathay flight number and departure date."], to: view)
                return
            }
            guard !flightLookupRunning, Date().timeIntervalSince(lastFlightLookup) >= 30 else {
                replyFlight(["requestID": requestID, "error": "Wait 30 seconds between flight checks."], to: view)
                return
            }
            flightLookupRunning = true
            lastFlightLookup = Date()
            // Fixed public passenger-search endpoint; web content cannot supply a URL,
            // credentials, headers or arbitrary body. This is not a general HTTP proxy.
            var request = URLRequest(url: URL(string: "https://api.cathaypacific.com/flightinformation/flight-status/olss-flight-status/v5.0/flightStatusByFlightNumber")!)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: ["travelDate": date, "carrierCode": "CX", "flightNumber": number, "locale": "en_HK", "departureArrival": "D"])
            Task { @MainActor [weak self, weak view] in
                guard let self else { return }
                defer { self.flightLookupRunning = false }
                do {
                    let (data, response) = try await self.flightSession.data(for: request)
                    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
                        self.replyFlight(["requestID": requestID, "error": "Flight source returned HTTP \(code). Try again later."], to: view)
                        return
                    }
                    guard data.count <= 1_000_000, let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                        self.replyFlight(["requestID": requestID, "error": "Flight source returned an invalid response."], to: view)
                        return
                    }
                    self.replyFlight(["requestID": requestID, "httpStatus": 200, "receivedAt": ISO8601DateFormatter().string(from: Date()), "payload": payload], to: view)
                } catch {
                    self.replyFlight(["requestID": requestID, "error": "Flight lookup unavailable. Check your connection and try again."], to: view)
                }
            }
        }
        init(onMessage: @escaping ([String: Any]) -> Void) { self.onMessage = onMessage }
        func send(to view: WKWebView) {
            guard loaded else { return }
            view.callAsyncJavaScript("window.__journeyNativeReceive?.(snapshot)", arguments: ["snapshot": payload], in: nil, in: .page) { _ in }
        }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { loaded = true; send(to: webView) }
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true,
                  let body = message.body as? [String: Any] else { return }
            if body["type"] as? String == "flightLookup" {
                lookupFlight(body, in: message.webView)
                return
            }
            if body["type"] as? String == "copyInspectorLink",
               let room = body["room"] as? String,
               room.range(of: "^[a-f0-9]{48}$", options: .regularExpression) != nil {
                UIPasteboard.general.string = "https://htmlpreview.github.io/?https://raw.githubusercontent.com/Chadzzy/MLDOT/codex/iphone-journey/ios/JourneyApp/Resources/journey.html#inspector/\(room)"
                return
            }
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
