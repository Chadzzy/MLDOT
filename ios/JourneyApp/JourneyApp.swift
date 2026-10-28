import SwiftUI

@main struct JourneyApp: App {
    var body: some Scene { WindowGroup { JourneyRootView() } }
}

struct RecoveryRequest: Identifiable { let id = UUID(); let text: String }

struct JourneyRootView: View {
    @StateObject private var store = SimulationStore()
    @StateObject private var bridge = JourneyWebBridge()
    @State private var controls = false
    @State private var recoveryRequest: RecoveryRequest?
    @Environment(\.scenePhase) private var scenePhase
    var body: some View {
        ZStack(alignment: .topTrailing) {
            JourneyWebView(bridge: bridge, payload: store.payload) { message in
                switch message["type"] as? String {
                case "controls": controls = true
                case "preferences":
                    if let id = message["requestID"] as? String, UUID(uuidString: id) != nil,
                       let priority = message["priority"] as? String, ["business", "earliest"].contains(priority),
                       let text = message["text"] as? String, text.count <= 500 {
                        Task {
                            let ok = await store.change("preferences", args: ["priority": priority, "text": text])
                            bridge.preferenceResult(requestID: id, ok: ok, message: ok ? "Saved" : (store.errorMessage ?? "Please wait for the current change, then try again."))
                        }
                    }
                case "recoveryRequest":
                    if let text = message["text"] as? String, text.count <= 500 {
                        recoveryRequest = RecoveryRequest(text: text)
                    }
                default: break
                }
            }
            if store.errorMessage != nil {
                Button("Journey sync needs attention") { controls = true }
                    .font(.caption).padding(10).background(.regularMaterial, in: Capsule())
                    .frame(maxWidth: .infinity, alignment: .leading).padding(.leading, 12).padding(.top, 8).padding(.trailing, 66)
            }
            Button { controls = true } label: {
                Image(systemName: "ellipsis.circle.fill")
                    .font(.system(size: 26)).symbolRenderingMode(.palette)
                    .foregroundStyle(Color(red: 0, green: 0.37, blue: 0.39), .white)
                    .padding(10).background(.ultraThinMaterial, in: Circle())
            }
            .accessibilityLabel("Journey simulation settings")
            .padding(.trailing, 12).padding(.top, 4)
        }
        .background(Color(red: 0.97, green: 0.97, blue: 0.96))
        .preferredColorScheme(.light)
        .sheet(isPresented: $controls) { SimulationControls(store: store) }
        .sheet(item: $recoveryRequest) { request in
            RecoveryPriorityView(request: request.text) { priority in
                let saved = await store.change("preferences", args: ["priority": priority, "text": request.text])
                if saved { bridge.applyPriority(priority) }
                return saved
            }
        }
        .onChange(of: scenePhase) { _, phase in
            bridge.setActive(phase == .active)
            if phase == .active { store.resume() } else { store.suspend() }
        }
    }
}
