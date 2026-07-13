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
                    accent: .cyan,
                    objects: [
                        ModuleObject(title: "CloudCommand Core", line1: "control plane service", line2: "resources: 6 bound", status: true),
                        ModuleObject(title: "CloudCommand API", line1: "API gateway", line2: "resources: 7 bound", status: true),
                        ModuleObject(title: "Billing API", line1: "service endpoint", line2: "resources: 4 bound", status: true)
                    ]
                )

                LayerPanel(
                    title: "Resources",
                    meta: "classes and objects",
                    accent: .green,
                    objects: [
                        ModuleObject(title: "compute.workload", line1: "mapped: kubernetes/deployment", line2: "health: passing"),
                        ModuleObject(title: "network.service", line1: "mapped: kubernetes/service", line2: "health: passing"),
                        ModuleObject(title: "runtime.secret", line1: "mapped: kubernetes/secret", line2: "health: watched")
                    ]
                )

                LayerPanel(
                    title: "Providers",
                    meta: "backing systems",
                    accent: .purple,
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

            Text("REV SWF01")
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
    let accent: Color
    let objects: [ModuleObject]

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(title)
                    .font(.system(size: 14, weight: .regular, design: .monospaced))
                    .tracking(1.0)
                    .foregroundStyle(.white.opacity(0.84))

                Spacer()

                Text(meta)
                    .font(.system(size: 10, weight: .regular, design: .monospaced))
                    .tracking(1.6)
                    .textCase(.uppercase)
                    .foregroundStyle(.cyan.opacity(0.55))
            }
            .frame(height: 36)
            .padding(.horizontal, 22)
            .background(Color.cyan.opacity(0.035))
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(Color.cyan.opacity(0.10))
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
        .overlay(Rectangle().stroke(Color.cyan.opacity(0.18), lineWidth: 1))
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
                    .foregroundStyle(accent.mix(with: .white, by: 0.28))
            }

            Text(object.line1)
                .foregroundStyle(.white.opacity(0.52))

            Text(object.line2)
                .foregroundStyle(.white.opacity(0.52))
        }
        .font(.system(size: 11, weight: .regular, design: .monospaced))
        .frame(maxWidth: .infinity, minHeight: 112, alignment: .topLeading)
        .padding(16)
        .background {
            // On Tahoe/Xcode 26, try replacing this block with:
            // RoundedRectangle(cornerRadius: 6).glassEffect()
            RoundedRectangle(cornerRadius: 6)
                .fill(.ultraThinMaterial.opacity(0.92))
        }
        .overlay {
            RoundedRectangle(cornerRadius: 6)
                .stroke(.white.opacity(0.28), lineWidth: 1)
        }
        .shadow(color: .orange.opacity(0.12), radius: 26, y: 18)
        .shadow(color: .black.opacity(0.30), radius: 28, y: 18)
    }
}

struct ModuleObject: Identifiable {
    let id = UUID()
    let title: String
    let line1: String
    let line2: String
    var status: Bool = false
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
