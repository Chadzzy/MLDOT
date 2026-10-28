import Foundation
import Combine

@MainActor final class SimulationStore: ObservableObject {
    @Published private(set) var simulation: JourneySimulation
    @Published var now = Date()
    private let key = "journey-simulation-v1"
    private var timer: AnyCancellable?
    init() {
        simulation = JourneySimulation.restore(UserDefaults.standard.data(forKey: key))
        timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect().sink { [weak self] date in
            self?.now = date
        }
    }
    func update(_ action: (inout JourneySimulation, Date) -> Void) {
        let date = Date(); action(&simulation, date); now = date
        if let data = try? JSONEncoder().encode(simulation) { UserDefaults.standard.set(data, forKey: key) }
    }
    func resume() { now = Date() }
}
