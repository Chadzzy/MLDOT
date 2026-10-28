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
            JourneyWebView(bridge: bridge, payload: store.simulation.payload(at: store.now)) { message in
                switch message["type"] as? String {
                case "controls": controls = true
                case "recoveryRequest":
                    if let text = message["text"] as? String, text.count <= 500 {
                        recoveryRequest = RecoveryRequest(text: text)
                    }
                default: break
                }
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
                bridge.applyPriority(priority)
            }
        }
        .onChange(of: scenePhase) { _, phase in if phase == .active { store.resume() } }
    }
}
