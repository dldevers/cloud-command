import SwiftUI

@main
struct CloudCommandGlassTestApp: App {
    var body: some Scene {
        WindowGroup {
            CloudCommandGlassTestView()
                .frame(minWidth: 1100, minHeight: 760)
        }
        .windowStyle(.hiddenTitleBar)
    }
}

struct CloudCommandGlassTestView: View {
    var body: some View {
        ZStack {
            MidnightGrid()

            VStack(spacing: 8) {
                topBar

                LayerPanel(
                    title: "Applications",
                    meta: "3 running",
                    actionLabel: "Add application",
                    accent: Color(red: 0.24, green: 0.70, blue: 1.00),
                    objects: [
                        ModuleObject(title: "CloudCommand Core", line1: "control plane service", line2: "resources: 6 bound", status: true),
                        ModuleObject(title: "CloudCommand API", line1: "API gateway", line2: "resources: 7 bound", status: true),
                        ModuleObject(title: "Billing API", line1: "service endpoint", line2: "resources: 4 bound", status: true)
                    ]
                )

                LayerPanel(
                    title: "Resources",
                    meta: "classes and objects",
                    actionLabel: "Add resource",
                    accent: Color(red: 0.18, green: 0.72, blue: 0.34),
                    objects: [
                        ModuleObject(title: "compute.workload", line1: "mapped: kubernetes/deployment", line2: "health: passing"),
                        ModuleObject(title: "network.service", line1: "mapped: kubernetes/service", line2: "health: passing"),
                        ModuleObject(title: "runtime.secret", line1: "mapped: kubernetes/secret", line2: "health: watched")
                    ]
                )

                LayerPanel(
                    title: "Providers",
                    meta: "backing systems",
                    actionLabel: "Add provider",
                    accent: Color(red: 0.70, green: 0.34, blue: 0.92),
                    objects: [
                        ModuleObject(title: "kubernetes.local", line1: "provider: local", line2: "state: reachable"),
                        ModuleObject(title: "runtime.agent", line1: "mode: evidence only", line2: "state: listening"),
                        ModuleObject(title: "cloudcommand.core", line1: "policy: active", line2: "decisions: local")
                    ]
                )

                commandBar
            }
            .padding(10)
        }
    }

    private var topBar: some View {
        HStack {
            Image(systemName: "cloud")
                .font(.system(size: 28, weight: .regular))
                .foregroundStyle(.white.opacity(0.9))

            Spacer()

            Text(Date.now, style: .time)
                .font(.system(size: 11, weight: .regular, design: .monospaced))
                .tracking(2)
                .padding(.horizontal, 14)
                .frame(height: 24)
                .background(.black.opacity(0.7), in: Rectangle())
                .overlay(Rectangle().stroke(.cyan.opacity(0.18), lineWidth: 1))

            Spacer()

            Text("REV SWF10")
                .font(.system(size: 10, weight: .regular, design: .monospaced))
                .tracking(1.4)
                .foregroundStyle(.white.opacity(0.78))
        }
        .frame(height: 44)
    }

    private var commandBar: some View {
        HStack {
            Text("COMMAND")
                .foregroundStyle(.cyan.opacity(0.72))
                .tracking(1.4)

            Text("cloud-command")
                .foregroundStyle(.green.opacity(0.85))

            Text(" inspect layers")
                .foregroundStyle(.white.opacity(0.78))

            Spacer()

            Text("ready")
                .foregroundStyle(.white.opacity(0.78))
        }
        .font(.system(size: 12, weight: .regular, design: .monospaced))
        .frame(height: 48)
        .padding(.horizontal, 16)
        .background(.black.opacity(0.35))
        .overlay(Rectangle().stroke(.cyan.opacity(0.12), lineWidth: 1))
    }
}

struct LayerPanel: View {
    let title: String
    let meta: String
    let actionLabel: String?
    let accent: Color
    let objects: [ModuleObject]

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .center, spacing: 12) {
                Text(title)
                    .font(.system(size: 14, weight: .regular, design: .monospaced))
                    .tracking(1.0)
                    .foregroundStyle(.white.opacity(0.76))
                    .frame(maxHeight: .infinity, alignment: .center)

                Spacer()

                Text(meta)
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .tracking(2.4)
                    .textCase(.uppercase)
                    .foregroundStyle(.white.opacity(0.66))
                    .frame(maxHeight: .infinity, alignment: .center)

                if let actionLabel {
                    Text(actionLabel)
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .tracking(1.2)
                        .foregroundStyle(.white.opacity(0.78))
                        .padding(.horizontal, 10)
                        .frame(height: 24)
                        .background(Color.black.opacity(0.22))
                        .overlay {
                            RoundedRectangle(cornerRadius: 3)
                                .stroke(accent.opacity(0.58), lineWidth: 0.75)
                        }
                }
            }
            .frame(height: 38, alignment: .center)
            .padding(.horizontal, 22)
            .background(Color.cyan.opacity(0.035))
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(accent.opacity(0.16))
                    .frame(height: 1)
            }

            HStack(spacing: 14) {
                ForEach(objects) { object in
                    GlassModuleObject(object: object, accent: accent)
                }

                Spacer(minLength: 0)
            }
            .padding(.horizontal, 22)
            .padding(.top, 16)

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity)
        .background(Color(red: 0.01, green: 0.04, blue: 0.075).opacity(0.72))
        .overlay(Rectangle().stroke(accent.opacity(0.34), lineWidth: 1))
    }
}

struct GlassModuleObject: View {
    let object: ModuleObject
    let accent: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 8) {
                if object.status {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 7, height: 7)
                        .shadow(color: .green.opacity(0.65), radius: 8)
                }

                Text(object.title)
                    .font(.system(size: 14, weight: .regular, design: .monospaced))
                    .tracking(0.4)
                    .foregroundStyle(accent.mix(with: .white, by: 0.48))
            }

            Text(object.line1)
                .foregroundStyle(.white.opacity(0.76))

            Text(object.line2)
                .foregroundStyle(.white.opacity(0.76))
        }
        .font(.system(size: 11, weight: .regular, design: .monospaced))
        .frame(maxWidth: .infinity, minHeight: 112, alignment: .topLeading)
        .padding(16)
        .overlay(alignment: .topTrailing) {
            SegmentedGauge(used: object.gaugeUsed, total: 16)
                .padding(.top, 14)
                .padding(.trailing, 14)
        }
        .background {
            RoundedRectangle(cornerRadius: 5)
                .fill(accent.opacity(0.075))
        }
        .background {
            RoundedRectangle(cornerRadius: 5)
                .fill(Color(red: 0.010, green: 0.018, blue: 0.034).opacity(0.70))
        }
        .overlay {
            RoundedRectangle(cornerRadius: 5)
                .stroke(accent.opacity(0.52), lineWidth: 0.65)
        }
        .overlay {
            RoundedRectangle(cornerRadius: 5)
                .stroke(.white.opacity(0.10), lineWidth: 0.5)
                .blendMode(.screen)
        }
        .shadow(color: accent.opacity(0.08), radius: 14, y: 10)
        .shadow(color: .black.opacity(0.30), radius: 20, y: 14)
    }
}

struct ModuleObject: Identifiable {
    let id = UUID()
    let title: String
    let line1: String
    let line2: String
    var status: Bool = false
    var gaugeUsed: Int = 11
}

struct SegmentedGauge: View {
    let used: Int
    let total: Int

    var body: some View {
        ZStack {
            ForEach(0..<total, id: \.self) { index in
                Capsule()
                    .fill(index < used ? Color.white.opacity(0.86) : Color.white.opacity(0.12))
                    .frame(width: 2.2, height: 6.2)
                    .offset(y: -13)
                    .rotationEffect(.degrees(Double(index) / Double(total) * 360))
            }

            Circle()
                .fill(Color.black.opacity(0.22))
                .frame(width: 15, height: 15)
                .overlay {
                    Circle()
                        .stroke(Color.white.opacity(0.16), lineWidth: 0.5)
                }
        }
        .frame(width: 34, height: 34)
    }
}

struct MidnightGrid: View {
    var body: some View {
        ZStack {
            Color(red: 0.005, green: 0.02, blue: 0.045)

            GridPattern()
                .stroke(Color.white.opacity(0.035), lineWidth: 1)
        }
        .ignoresSafeArea()
    }
}

struct GridPattern: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let step: CGFloat = 24

        var x: CGFloat = 0
        while x <= rect.width {
            path.move(to: CGPoint(x: x, y: 0))
            path.addLine(to: CGPoint(x: x, y: rect.height))
            x += step
        }

        var y: CGFloat = 0
        while y <= rect.height {
            path.move(to: CGPoint(x: 0, y: y))
            path.addLine(to: CGPoint(x: rect.width, y: y))
            y += step
        }

        return path
    }
}
